# Plan 131-01: Resolução de Imagem na Tela de Loading e Eliminação Definitiva de Tela Preta pós-Loading no Game Viewport

## Context & Root Cause Analysis
1. **Ausência de imagem na tela de loading (`ExuraLoadingScreen.tsx`):**
   - A imagem de fundo era aplicada puramente via CSS string `backgroundImage: radial-gradient(...), url(...)` no container raiz.
   - O browser prioritiza tags `<img>` e pode postergar ou falhar o carregamento de background-images complexas durante inicializações pesadas.
   - Quando `ThaisCityArena` disparava mais de 600 requisições simultâneas de texturas pelo `loadBatch`, o pool de conexões HTTP (6 conexões simultâneas) ficava saturado, impedindo que os 332KB de `thais-loading.jpg` fossem baixados antes do timer de 10s da tela de loading.
2. **Tela preta após o loading no Game Viewport (`ThaisCityArena.tsx`):**
   - `ThaisCityArena` continha uma instrução síncrona `await loadBatch(priorityUrls, 40)`.
   - `priorityUrls` continha **608 texturas**, incluindo 550 texturas de mapa e todos os efeitos/projéteis do jogo.
   - O carregamento dessas 608 texturas levava ~33 segundos.
   - Como a tela de loading durava apenas 10 segundos, ela fechava enquanto o código ainda estava bloqueado em `await loadBatch(...)`.
   - Durante esse período, o palco Pixi sequer tinha construído os tiles, não tinha adicionado o ticker e a câmera não estava atualizando, mantendo o canvas com a cor de fundo preta (`#07090b`).
   - Se qualquer textura gerasse erro ou `NaN` nos cálculos de câmera, o viewport ficava permanentemente escuro.

## Key Changes
1. **`ExuraLoadingScreen.tsx`:**
   - Adicionar tag explícita `<img src={bgImage || '/images/loading/thais-loading.jpg'} ... />` com `object-fit: cover`, `priority`, z-index adequado e fallback automático via `onError` para `/images/loading/loading-bg.jpg`.
   - Manter a vinheta radial em camada acima da imagem e todo o conteúdo (curiosidades e barra de loading) em `z-index: 10`.
2. **`ThaisCityArena.tsx`:**
   - Reduzir drasticamente o `priorityUrls` síncrono para os ~6 assets vitais imediatos (`floorUrl`, `wallUrl`, `rugUrl`, `dummyUrl`, `decorUrl`, `mountUrl`).
   - Mover todo o carregamento das 550 texturas de Thais (`immediateThaisMapUrls` e `distantThaisMapUrls`), efeitos e projéteis para streaming assíncrono em segundo plano (`void loadBatch(...)`).
   - Como o sistema de `pendingTileSprites` e `resolvePendingSprites` já existe, os sprites de chão e objetos recebem a textura assim que chegam, sem bloquear um único frame do jogo.
   - Blindar o cálculo de câmera contra `NaN`: validação com `Number.isFinite` e fallback de largura/altura da tela para `window.innerWidth` / `window.innerHeight`.
3. **`GamePrototype.tsx`:**
   - Adicionar pré-carregamento imediato das imagens de loading no `useEffect` de montagem inicial.
