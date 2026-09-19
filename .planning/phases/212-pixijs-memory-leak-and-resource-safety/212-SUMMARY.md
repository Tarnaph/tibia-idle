# Phase 212 Summary: PixiJS Memory Safety & Resource Management

## 🎯 Objetivo Concluído
Investigar e eliminar definitivamente o vazamento de memória (PixiJS memory leak e tickers sem destroy) que provocava o erro **"Código de erro: Out of Memory"** no navegador após deixar o jogo parado aberto por períodos prolongados.

---

## 🔍 Causas Raízes Identificadas e Resolvidas

1. **Texturas de Textos Dinâmicos Órfãs no WebGL (PixiJS v8 Text Backing Store):**
   - **Problema:** A cada tick de combate em caçadas ([`PixiArena.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/PixiArena.tsx)), números de dano, cura, XP e balões de fala criam nós `new Text(...)` dinâmicos. Quando o efeito terminava (`progress >= 1`), era executado `visual.root.destroy({ children: true })`. No PixiJS v8, containers não destroem automaticamente a textura canvas de backing store de nós `Text` a menos que `{ texture: true }` seja passado diretamente no nó de texto. Ao longo de horas, centenas de milhares de texturas dinâmicas acumulavam-se na memória de vídeo/WebGL da GPU.
   - **Solução:** Implementação da função recursiva `destroyVisualNode(node)` em [`pixiMemorySafety.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/lib/pixiMemorySafety.ts). Ela detecta nós de texto dinâmicos (`node.style !== undefined && node._texture`) e executa `node.destroy({ texture: true })`, liberando imediatamente a textura do WebGL Texture Manager.

2. **Alocação Contínua de Elementos DOM `<canvas>`:**
   - **Problema:** Em [`outfitRecolor.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/lib/outfitRecolor.ts), as funções `drawRecoloredLayer` e `drawRecoloredLayerFromAtlas` executavam `document.createElement('canvas')` 3 vezes a cada camada desenhada (`offCanvas`, `maskCanvas`, `recoloredCanvas`). O motor Blink/Skia do Chrome aloca buffers nativos na GPU para cada elemento canvas criado, sobrecarregando o coletor de lixo.
   - **Solução:** Criação do pool síncrono `getScratchCanvases(width, height)` em `pixiMemorySafety.ts`, que reutiliza 3 instâncias de canvas de rascunho em memória para todas as operações de recoloração do ciclo de vida, eliminando dezenas de milhares de alocações por minuto.

3. **Caches de Texturas Ilimitados na Memória:**
   - **Problema:** `recoloredCanvasCache` e `provisionalCanvasCache` cresciam indefinidamente conforme novos trajes, direções e animações eram processados.
   - **Solução:** Implementação de `setBoundedCanvasCache` com estratégia LRU (capacidade máxima de 512 para definitivos e 128 para provisórios). Ao atingir o limite, o item mais antigo é descartado e suas dimensões são zeradas (`width = 0; height = 0`), forçando o navegador a liberar instantaneamente a textura da GPU. Na limpeza geral `clearRecoloredCanvasCache`, todos os elementos têm suas dimensões zeradas antes da limpeza do mapa.

4. **Acúmulo Indefinido de Mensagens de Fala (`processedSpeechIds`):**
   - **Problema:** Em [`ThaisCityArena.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx), o `Set` `processedSpeechIds` crescia continuamente sem poda, ao contrário de `processedCityEventIds`.
   - **Solução:** Adicionada poda automática quando o tamanho ultrapassar 2.000 itens (removendo os 1.000 mais antigos).

5. **Atores Remotos Desconectados Mantidos na Cena:**
   - **Problema:** Quando jogadores remotos saíam da sala de Thais ou desconectavam, suas instâncias visuais (`CityActorView`) permaneciam registradas em `actorViews` e `actorsLayer` indefinidamente.
   - **Solução:** Auditoria contínua de `liveActorIds` no loop do ticker: atores que não pertencem ao jogador local, nem aos NPCs canônicos de Thais, nem aos remotos ativos têm seus nós visuais destruídos com `destroyVisualNode(view.root)` e são removidos de `actorViews`, `remoteMotionTracks` e `remoteAttackPoseUntilMap`.

6. **Desmontagem Limpa de Componentes (Unmount & Cleanup):**
   - **Problema:** No encerramento de [`PixiArena.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/PixiArena.tsx), [`ThaisCityArena.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx) e [`TrainingArena.tsx`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/TrainingArena.tsx), o ticker do Pixi continuava agendado ou nós de texto não eram purgados do WebGL.
   - **Solução:** Integração da rotina `safelyDestroyPixiApp(app)` que interrompe o ticker (`app.ticker.stop()`), purga o palco com `destroyVisualNode` e destrói a aplicação de forma segura sem lançar exceções.

---

## 🧪 Verificação e Validação

1. **Testes Automatizados (Vitest):**
   - Criada a suíte [`tests/phase212-pixijs-memory-leak-and-resource-safety.test.ts`](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase212-pixijs-memory-leak-and-resource-safety.test.ts) cobrindo:
     - Liberação de texturas de nós Text com `{ texture: true }`
     - Destruição recursiva de nós e segurança contra exceções
     - Parada limpa de tickers e encerramento de aplicações Pixi
     - Reuso de scratch canvases sem novas alocações de DOM
     - Limitação e zeramento de dimensões no descarte de caches LRU
     - Auditoria estática nos componentes `PixiArena`, `ThaisCityArena` e `TrainingArena`
   - **Resultado:** 14/14 testes aprovados (100%).
   - Testes visuais relacionados (`presentation`, `thais-arena`, `black-screen`, `outfits`): 18/18 testes aprovados (100%).

2. **Verificação de Tipagem (TypeScript):**
   - `npm run typecheck`: 0 erros.
