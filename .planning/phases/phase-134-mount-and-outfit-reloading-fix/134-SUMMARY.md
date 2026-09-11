# Fase 134: Resiliência de Carregamento de Montaria, Troca de Outfit, Atalhos de Dock e Eliminação de Deadlock no Vite RSC

## Resumo Executivo

A **Fase 134** foi executada com o objetivo de diagnosticar e solucionar definitivamente os problemas relatados pelo usuário:
1. **Montaria não carregando** no jogo ou no modal de outfits.
2. **Impossibilidade de trocar de outfit** / travas ao salvar estado do personagem.
3. **Falta de acessibilidade imediata** para abrir o customizador de outfits ou alternar a montaria na tela principal de jogo.

---

## Causa Raiz Diagnosticada

1. **Deadlock do Vite RSC em Endpoints de Servidor:**
   - Na Fase 133, a adição de `'vinext'` no `optimizeDeps.exclude` em `vite.config.ts` causou colapso na comunicação interna de IPC (`vite:invoke`) do runner de Server Components (`@vitejs/plugin-rsc`), gerando `transport invoke timed out after 60000ms`. Isso congelava requisições POST para `/api/characters/[id]/save`, travando qualquer tentativa de salvar outfit ou montaria.
2. **Blacklist Permanente Indevida no Cache de Sprites (`outfitRecolor.ts`):**
   - O `loadImage` possuía um timeout curto (3500ms) e, caso ocorresse um atraso momentâneo por compilação do dev server ou disco, o URL da montaria ou outfit era adicionado permanentemente ao `failedImageUrls` (Set sem expiração nem TTL).
   - Quando `urls.mountUrl` caía nessa blacklist, o `getRecoloredCanvasSync` e `renderRecoloredOutfit` consideravam `mountImg = undefined`, forçando o desenho unmounted e ignorando a montaria para sempre durante a sessão.
3. **Ausência de Botões de Outfit e Montaria na Dock Bar Superior:**
   - O componente `WindowDockBar.tsx` recebia `onOpenOutfit` do `GamePrototype.tsx`, mas não possuía botões na grade superior para abrir o modal de outfit ou alternar montaria.
4. **Ausência de Atalhos Canônicos no Teclado:**
   - Teclas clássicas como `U` (Outfit Customizer) e `Ctrl+R` (Alternar Montaria) não estavam mapeadas no event listener de teclado do `GamePrototype.tsx`.
5. **Desalinhamento de `activeCharacterId` e `mountActive` no `OutfitModal.tsx`:**
   - O modal de customização não limpava o cache de falhas transitórias ao ser aberto e mantinha `selectedCharId` desatualizado se o jogador alternasse o personagem ativo.

---

## Implementações Realizadas

### 1. Desbloqueio do Vite RSC (`vite.config.ts`)
- Revertido `optimizeDeps.exclude` estritamente para `['@prisma/client']`.
- Verificado que endpoints de servidor (`/api/config`, `/api/characters/[id]/save`) respondem de forma instantânea sem qualquer timeout ou deadlock.

### 2. Resiliência de Carregamento e TTL de Falha (`apps/web/lib/outfitRecolor.ts`)
- **Timeout estendido para 6.000ms**: Garante tempo de sobra para leitura de sprites sem bloquear o browser nem exceder timeouts de teste.
- **TTL de 15.000ms para Imagens com Falha (`FAILED_IMAGE_TTL_MS`)**: Substituída a blacklist permanente por uma janela transitória de 15s. Ao expirar o TTL, novas tentativas de carregar o asset são permitidas de forma autônoma.
- **`clearFailedImageCache()`**: Função exportada para purgar instantaneamente falhas transitórias quando o jogador abre o modal de customização ou monta em sua criatura.

### 3. Botões Dedicados na Dock Bar (`apps/web/components/window/WindowDockBar.tsx`)
- Adicionados os botões:
  - `🥋 Outfit` (`data-dock-id="outfit-btn"`) com atalho `[U]`.
  - `🐎 Montaria` (`data-dock-id="mount-btn"`) com atalho `[Ctrl+R]`, estilizado dinamicamente em verde quando o herói estiver montado.

### 4. Atalhos Universais de Teclado (`apps/web/components/GamePrototype.tsx`)
- Mapeado atalho `U` (sem teclas modificadoras) para abrir o customizador de outfits.
- Mapeado atalho `Ctrl+R` / `Cmd+R` para alternar o status de montaria (`handleToggleMount`).

### 5. Sincronização Inteligente no `OutfitModal.tsx`
- Invocação de `clearFailedImageCache()` logo no montamento do modal.
- Sincronização garantida de `selectedCharId = activeCharacterId`.
- Restauração automática de `mountActive` ao abrir o modal para personagens que possuam uma montaria equipada válida (`char.mount && char.mount !== 'none'`).

---

## Verificação e Testes

- **Testes Unitários e de Integração:**
  - `tests/phase134-mount-and-outfit-reloading-fix.test.ts`: **5/5 testes aprovados** (TTL de falhas, expiração, botões do dock com `data-dock-id`, atalhos `U` e `Ctrl+R`, e sincronização de personagem no modal).
  - `tests/phase129-audit-all-outfits-preview.test.ts`: **7/7 testes aprovados** (auditoria dos 78 outfits, trajes com montaria ativa, direções e timeout de segurança).
- **TypeScript:**
  - `npm run typecheck`: **0 erros de compilação**.
