# Phase 121 Summary: Diagnóstico e Correção de Outfits Invisíveis, Montarias, Animação de Caminhada e Trava do Dev Server

## Status: Complete ✅
- **Testes:** 122 test files (679 testes aprovados no Vitest).
- **Tipagem:** 0 erros no TypeScript (`npm run typecheck`).
- **Suíte de Regressão Criada:** `tests/phase121-outfit-mount-animation-fix.test.ts` (6 testes aprovados).

---

## 1. Problemas Identificados e Diagnóstico

### A. Preview Canvas Preto no Modal de Aparência
- **Diagnóstico:** Em `apps/web/lib/outfitRecolor.ts`, a função `loadImage(url)` armazenava a instância de `HTMLImageElement` no cache antes de sua carga terminar (`complete === false`). Quando o modal disparava requisições concorrentes ou em paralelo ao ticker de renderização a 60 FPS, chamadas subsequentes recuperavam a imagem inacabada e sobrescreviam `img.onload`. As Promises de chamadas anteriores eram destruídas e ficavam eternamente pendentes sem resolver.
- No `OutfitModal.tsx`, a função `renderRecoloredOutfit` limpava o canvas com `targetCtx.clearRect(0, 0, w, h)` antes de esperar as Promises. Como as Promises nunca resolviam, o canvas permanecia permanentemente preto/vazio.

### B. Personagem Sem Animação de Passos (Walk Cycle Congelado) e Montarias Sumindo
- **Diagnóstico:** No loop de renderização do jogo (`ThaisCityArena.tsx`), a cada tick de caminhada o `charWalkFrame` cicla entre 1 e 8 a cada ~25ms. Cada tick chamava `getRecoloredCanvasSync` solicitando os frames `f1..f8`. Como `loadImage` sobrescrevia continuamente o handler `onload` a 60 FPS, as texturas de caminhada nunca completavam a carga assíncrona. O compositor visual caía perpetuamente no fallback provisório de idle (Frame 0), fazendo o personagem andar em pose estática sem mover as pernas, e montarias sumiam ou ficavam presas em frame 0.

### C. Trava do Dev Server e Ícones dos Cards Invisíveis
- **Diagnóstico:** Em `OutfitModal.tsx`, `getMountThumbUrl('none')` retornava `""`, injetando `<img src="" />` no DOM. No React 19, passar `src=""` faz o navegador emitir erro e baixar a página HTML inteira recursivamente pela rede. Isso sobrecarregou o module runner do Vite (`transport invoke timed out after 60000ms`), congelando o servidor de desenvolvimento. Com o servidor travado, as imagens `/generated/outfit-thumbs/*.png` não podiam ser servidas, deixando as cartas de outfits sem sprites.

---

## 2. Correções Implementadas

1. **`apps/web/lib/outfitRecolor.ts`:**
   - Adicionado mapa de Promises em trânsito: `inFlightImagePromises = new Map<string, Promise<HTMLImageElement>>()`.
   - Garantido que chamadas concorrentes para a mesma URL compartilhem a mesma Promise ativa, sem sobrescrever `onload` nem duplicar downloads.
   - `imageElementCache` agora só armazena imagens plenamente carregadas e válidas (`complete && naturalWidth > 0`).
   - Em `renderRecoloredOutfit`, a composição agora é desenhada em um buffer offscreen (`offCanvas`) e só transferida ao `targetCanvas` via blit atômico quando todas as camadas estiverem prontas, eliminando 100% dos flickers e impedindo que o canvas fique preto durante o carregamento.
   - Em `getRecoloredCanvasSync`, corrigidos os fallbacks unmounted para preservar os `addons` do personagem.

2. **`apps/web/components/OutfitModal.tsx`:**
   - `getMountThumbUrl` agora retorna `null` para montarias nulas ou `'none'`.
   - Substituído `<img src="" />` por um ícone estilizado de caminhada a pé (`🚶`) no card 'Sem Montaria', eliminando o loop de requisições SSR no dev server.

3. **`app/globals.css`:**
   - Ajustada a regra `.tibia-card-sprite` com centralização e escala adequadas para compensar a âncora do tile 1x1 na grade 64x64, garantindo que o sprite apareça perfeitamente centralizado e visível na grade de cards.

4. **`tests/phase121-outfit-mount-animation-fix.test.ts`:**
   - Suíte com 6 testes cobrindo compartilhamento seguro de Promises no `loadImage`, renderização atômica em buffer offscreen, preservação de addons nos fallbacks, IDs canônicos e geração dos 8 frames de caminhada.

---

## 3. Verificação Automatizada

- `npm run typecheck`: **0 erros**
- `npm run test`: **122 test files / 679 testes aprovados (100%)**
