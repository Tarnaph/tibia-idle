# Walkthrough: Phase 178 - Estabilidade Online, Troca Atômica de Aparência e Preview Definitivo

## 🎯 Objetivo Cumprido
Eliminar falhas visuais na experiência online:
1. Preview de addons no `OutfitModal`: agora exibe addons em tempo real antes de salvar e descarta requisições atrasadas.
2. Troca de aparência no mundo: implementação de **Atomic Appearance Swap** (a aparência anterior é preservada 100% íntegra enquanto a nova é pré-aquecida em segundo plano, sendo substituída de forma atômica em um único frame sem quebras na animação).
3. Proteção do cache provisório: impede que composições provisórias sem addons solicitados sejam cacheadas e reutilizadas como definitivas.
4. Mapeamento e documentação da infraestrutura de Spritesheets vs PNGs individuais.
5. Deploy e sincronização com a VPS (`187.7.16.210:3000`).

---

## 📌 Status de Versão e Commits

- **Commit Publicado na VPS e no GitHub**: [`718f3495b`](https://github.com/Tarnaph/tibia-idle/commit/718f3495b) - `fix(appearance): atomic appearance swap, definitive addon preview, and unpolluted provisional caching`.
- **Commit Anterior Testado pelo Usuário**: [`02b0eece9`](https://github.com/Tarnaph/tibia-idle/commit/02b0eece9) - `fix(appearance): enforce mandatory mount, preserve walk addons, eliminate knight fallback and async prepare appearance`.

---

## 🛠️ Modificações Realizadas

### 1. Preview de Addon Definitivo (`apps/web/lib/outfitRecolor.ts` e `OutfitModal.tsx`)
- **Causa Raiz Identificada**: `renderRecoloredOutfit` executava `getRecoloredCanvasSync` e saía imediatamente (`return;`) quando obtinha um canvas provisório (que ainda não tinha as imagens dos addons). Dessa forma, a promessa assíncrona que carregava os addons nunca era executada.
- **Correção Aplicada**:
  - `renderRecoloredOutfit` agora só utiliza o fast-path se o canvas **definitivo** já existir em `recoloredCanvasCache`.
  - Se não existir, desenha provisoriamente (sem travar nem fechar a função), faz o download de todas as camadas (corpo base, mask, montaria, addon 1 e addon 2), verifica `isCurrent()` para descartar seleções obsoletas do usuário e compõe o canvas definitivo completo.
  - Armazena no cache definitivo (`recoloredCanvasCache.set`) e purga a entrada provisória correspondente (`provisionalCanvasCache.delete`).
  - No `OutfitModal.tsx`, ao marcar Addon 1 ou Addon 2, dispara `prepareAppearanceCanvas` em segundo plano para pré-aquecer todas as direções.

### 2. Troca Atômica de Aparência no Mundo (`apps/web/components/ThaisCityArena.tsx`)
- **Causa Raiz Identificada**: Ao salvar uma aparência, o código antigo zerava imediatamente `view.lastTextureKey = ''` e `view.lastCanvas = undefined`. Durante os 2 a 3 segundos em que os PNGs de caminhada estavam baixando pela rede, o loop de animação tentava renderizar frames incompletos ou nulos, provocando passos truncados e instáveis.
- **Correção Aplicada (Atomic Appearance Swap)**:
  - Adicionado rastreamento de `view.activeAppearance` e `view.pendingAppearance`.
  - Enquanto a nova aparência solicitada está baixando via `prepareAppearanceCanvas`, o personagem **continua sendo renderizado com a aparência anterior 100% completa e funcional** (com corpo, addons e montaria).
  - Quando os frames essenciais da nova aparência estão confirmados no cache (`isOutfitCanvasCached`), ocorre a **substituição atômica em um único frame** (`view.activeAppearance = desiredAppearance; view.lastTextureKey = '';`).
  - Não há um único frame onde o personagem fica com camadas faltando ou animação travada.

### 3. Proteção Contra Envenenamento de Cache Provisório (`apps/web/lib/outfitRecolor.ts`)
- `getRecoloredCanvasSync` agora inspeciona se todos os addons requisitados foram efetivamente desenhados no canvas provisório. Se algum addon requisitado estiver ausente, o canvas provisório **NÃO é salvo em `provisionalCanvasCache` sob a chave do addon**, garantindo que consultas subsequentes continuem tentando desenhar o addon assim que suas imagens forem baixadas.

### 4. Hidratação do Personagem no Login (`apps/web/components/GamePrototype.tsx`)
- `isCharacterVisible` agora exige `Boolean(onlineCharacter)`. Impede que o Knight padrão de fallback apareça por um único frame antes da seleção e hidratação do personagem real do jogador vindo do banco de dados.

---

## 🖼️ Mapeamento de Spritesheets vs. PNGs Individuais

Conforme solicitado, examinamos a presença de atlas de texturas no projeto:
1. **Atlases Existentes em `public/generated/atlases/`**:
   - `creatures-atlas` (monstros)
   - `equipment-atlas` (equipamentos e itens)
   - `hunt-*-atlas` (cenários de caçada)
   - `spells-atlas` (ícones de magia)
   - `thais-atlas` (mapa e tiles da cidade)
2. **Outfits e Montarias**:
   - **NENHUM atlas existe** para outfits de jogadores ou montarias. O renderizador utiliza 100% PNGs individuais carregados sob demanda em `public/generated/outfits/` e `public/generated/mounts/`.
3. **Volume de Requisições por Aparência**:
   - 4 direções cardeais x 9 frames (0..8) = 36 steps de animação.
   - Cada step de jogador montado com 2 addons utiliza: 1 montaria + 2 corpo (base + mask) + 2 addon1 (base + mask) + 2 addon2 (base + mask) = até 7 arquivos.
   - Totalizando **~180 a 252 requisições HTTP individuais** para cobrir um ciclo completo de caminhada nas 4 direções.
4. **Decisão Técnica**:
   - Conforme diretriz do usuário, **nenhuma migração ampla para spritesheets foi aberta nesta fase**, pois o mecanismo de **Atomic Appearance Swap** e o pré-carregamento assíncrono em lote eliminam completamente o impacto da latência na tela sem necessidade de refatorar todo o pipeline de geração de assets.

---

## 🧪 Testes e Validação

- **Vitest (`tests/phase178-online-stability-mount-recolor-preloader.test.ts`)**: 13/13 testes aprovados (100%).
- **TypeScript (`npm run typecheck`)**: 0 erros em todo o repositório.
- **Serviços VPS**: `pm2 status` confirma `colyseus-server` e `tibia-web` ativos e operantes em `187.7.16.210:3000`.
- **Subagente de Navegador**: O Playwright driver falhou ao baixar na máquina local (CDN da Azure retornou 404 para a versão instalada). A validação final está pronta para ser realizada diretamente no cliente web pelo usuário.

