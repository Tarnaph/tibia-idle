# Phase 121: Diagnóstico e Correção de Outfits Invisíveis, Montarias, Animação de Andar e Trava do Dev Server

## Diagnóstico Completo dos Bugs Reportados

### 1. Character Preview Canvas Preto / Vazio no Modal de Aparência
- **Causa Raiz:** Em `apps/web/lib/outfitRecolor.ts`, a função `loadImage(url)` colocava `HTMLImageElement` no `imageElementCache` antes do término do carregamento (`img.complete === false`). Quando múltiplos pontos do app (ex: pré-carregamento de frames, renderizador do modal e ticker do jogo a 60fps) chamavam `loadImage` concorrentemente para a mesma URL, o segundo caller pegava a imagem inacabada e sobrescrevia `img.onload`. As Promises dos callers anteriores eram perdidas e nunca resolviam (travavam para sempre).
- No modal `OutfitModal.tsx`, `renderRecoloredOutfit` iniciava com `targetCtx.clearRect(0, 0, w, h)` no canvas visível e dava `await Promise.all([loadImage(urls.base), loadImage(urls.mask)])`. Como a Promise travava para sempre, o canvas nunca era desenhado e ficava 100% preto.

### 2. Personagem Sem Animação de Caminhada (Andar) e Montarias Invisíveis In-Game
- **Causa Raiz:** No loop do jogo (`ThaisCityArena.tsx`), a cada tick de movimento o `charWalkFrame` cicla entre 1 e 8 a cada ~25ms.
- Cada tick chamava `getRecoloredCanvasSync(outfitKey, ..., charWalkFrame, ...)` para o frame da vez.
- Para cada frame que ainda não estava pronto, `getRecoloredCanvasSync` disparava `loadImage()`. Por causa da substituição contínua de `img.onload` em cada tick a 60 FPS, as imagens de caminhada `f1..f8` (e os frames de caminhada da montaria) nunca chegavam ao estado `allLayersReady: true`.
- Consequentemente, `getRecoloredCanvasSync` caía eternamente no fallback provisório de idle (Frame 0). O personagem deslizava no mapa em pose parada, sem nenhuma animação de passos (walk cycle), e a montaria desaparecia ou ficava congelada em frame 0.

### 3. Trava do Dev Server (Vite Module Runner Timeout) e Thumbnails Vazios
- **Causa Raiz:** Em `OutfitModal.tsx` linha 499: para `mount.id === 'none'`, a função `getMountThumbUrl` retornava `""` (string vazia), gerando `<img src="" />`.
- No React 19, passar `src=""` emite o erro `An empty string ("") was passed to the src attribute. This may cause the browser to download the whole page again over the network`.
- O navegador disparava requisições HTML recursivas para `/game` como imagem, sobrecarregando o module runner do Vite (`transport invoke timed out after 60000ms`). Quando o servidor travava, as requisições de `/generated/outfit-thumbs/*.png` e rotas de API davam timeout, resultando na ausência visual dos ícones dos cards.

---

## Mudanças Propostas

### 1. `apps/web/lib/outfitRecolor.ts`
- Implementar cache de Promises em trânsito: `const inFlightPromises = new Map<string, Promise<HTMLImageElement>>()`.
- Garantir que qualquer chamada para uma imagem já em carregamento receba a mesma Promise ativa compartilhada, sem sobrescrever eventos nem duplicar requisições.
- Garantir que `imageElementCache` guarde apenas instâncias com `img.complete && img.naturalWidth > 0`.
- No `renderRecoloredOutfit`, renderizar primeiro em offscreen canvas (`document.createElement('canvas')`) e só copiar para o `targetCanvas` após toda a composição estar pronta, impedindo telas pretas e flickering.
- Em `getRecoloredCanvasSync`, corrigir os fallbacks de retorno para preservar os `addons` configurados no personagem em vez de forçar `0`.

### 2. `apps/web/components/OutfitModal.tsx`
- Corrigir `getMountThumbUrl`: retornar `null` quando `mountId === 'none'` e não renderizar `<img>` com `src=""`.
- Exibir placeholder sem montaria (ícone de caminhada a pé `🚶`) para o card 'Sem Montaria'.
- Ajustar estilo dos sprites de outfits nos cards para centralização perfeita na grade de 4 colunas.

### 3. `app/globals.css`
- Ajustar `.tibia-card-sprite:not(.mount-sprite)` para compensar a âncora 1x1 no grid 64x64, garantindo que o personagem fique perfeitamente centralizado e visível no card.

### 4. Testes de Regressão e Validação
- Criar suíte de testes `tests/phase121-outfit-mount-animation-fix.test.ts` cobrindo:
  - Resolução concorrente de `loadImage` sem perda de Promises.
  - Carregamento de frames de caminhada `f1..f8` sem travar no fallback de Frame 0.
  - Composição atômica sem limpar canvas visível prematuramente.
  - Tratamento de `mount === 'none'` sem `src=""`.
- Rodar `cmd.exe /c npm run typecheck` e garantir 0 erros.
- Rodar `cmd.exe /c npm run test` e garantir 100% de aprovação.
