# Phase 117-01-PLAN: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de Caminhada com 8 Frames)

## 1. Contexto e Diagnóstico Técnico da Causa Raiz

Após análise aprofundada das estruturas do `Tibia.dat` e `Tibia.spr` do cliente 10.98, comparando os arquivos em disco e decodificando os sprites binários reais dos looktypes (Citizen 128, Knight 131 e demais outfits/montarias), confirmamos com exatidão matemática a causa dos dois sintomas relatados:

### Causa 1: Por que o personagem parado fica com uma perna para a frente
- No formato do Tibia 10.98+, criaturas e outfits utilizam **Frame Groups** no `.dat`:
  - **`FrameGroup 0 (Idle)` (`frameGroupType: 0`)**: Contém exatamente **1 frame** (`frames: 1`). Esta é a pose canônica de repouso (os dois pés plantados e alinhados no chão).
  - **`FrameGroup 1 (Moving)` (`frameGroupType: 1`)**: Contém **8 frames** de caminhada (`frames: 8`). O frame 0 desse grupo é o início do passo com a perna esticada.
- O script de extração (`scripts/extract-complete-appearances.mjs` e `scripts/extract-tibia-outfits.ts`) lia exclusivamente `frameGroups.find(grp => grp.frameGroupType === 1)` (Moving) e ignorava o `FrameGroup 0 (Idle)`.
- Ao salvar os PNGs no disco como `f0`, `f1` e `f2`, o arquivo `f0-base.png` gravado foi o frame 0 do grupo **Moving** (que já é o passo com a perna esticada!).
- A pose de repouso genuína do Tibia (Group 0) **nunca havia sido exportada para o disco**. Logo, quando o jogo solicitava o frame 0 para um personagem parado, exibia o primeiro passo de caminhada.

### Causa 2: Por que a caminhada parecia não completar a animação inteira
- No Tibia 10.98, a caminhada completa da CipSoft possui **8 frames sequenciais**:
  - `f0..f3` (ou frames 0 a 3): ciclo da perna esquerda avançando e retornando ao ponto neutro.
  - `f4..f7` (ou frames 4 a 7): ciclo da perna direita avançando e retornando ao ponto neutro.
- O pipeline antigo truncou a extração em apenas 3 frames (`Math.min(app.frames, 3)`), descartando completamente os outros 5 frames da caminhada.
- No frontend, o código usava `walkCycle = [0, 1, 0, 2]`. Como `f0` era o passo esquerdo inicial, `f1` o meio do passo e `f2` o final, o personagem ficava em loop tocando apenas fragmentos da perna esquerda e voltando abruptamente, sem nunca dar o passo com a perna direita.

---

## 2. Solução Arquitetural e Plano de Implementação

### Passo 1: Atualização do Extrator de Assets (`scripts/extract-complete-appearances.mjs`)
1. Para cada outfit (e gênero), extrair:
   - **`f0` (Idle)**: Renderizado diretamente a partir de `FrameGroup 0` (Idle, frame 0), com suporte a todas as direções (north, east, south, west), addons 1 e 2, e rider montado.
   - **`f1` a `f8` (Moving)**: Renderizados a partir dos 8 frames do `FrameGroup 1` (Moving, frames 0 a 7), compondo a animação completa de caminhada do Tibia 10.98.
2. Executar o script de extração para regenerar os PNGs de todos os outfits e montarias canônicas em `public/generated/outfits/` e `public/generated/mounts/`.

### Passo 2: Atualização do Cache e Carregador de Texturas (`apps/web/lib/outfitRecolor.ts`)
1. Em `getOutfitLayerUrls`, atualizar o range de `safeFrame`:
   - `frame === 0`: Pose de repouso neutra (`f0`, extraída de FrameGroup 0).
   - `frame >= 1 && frame <= 8`: Frames da caminhada fluida (`f1` a `f8`).
2. Atualizar `preloadOutfitAllFrames` para carregar a pose de repouso (`f0`) e os frames de caminhada.

### Passo 3: Atualização dos Motores de Renderização PixiJS (`ThaisCityArena.tsx` e `PixiArena.tsx`)
1. No loop de animação:
   - Se parado (`!charIsMoving`): frame é **sempre 0** (`f0` = repouso com pés juntos).
   - Se andando (`charIsMoving`): ciclo de 8 passos sincronizado com a velocidade/duração do passo:
     `const walkCycle8 = [1, 2, 3, 4, 5, 6, 7, 8];`
     `const charWalkFrame = charIsMoving ? walkCycle8[Math.floor(progress * 8) % 8] : 0;`
2. Garantir transição instantânea e determinística entre movimento e repouso.

### Passo 4: Verificação, Testes e Auditoria
1. Criar `tests/phase117-idle-pose-and-8frame-walk.test.ts`:
   - Validar que o frame 0 do Idle corresponde à pose estática neutra.
   - Validar que a sequência de 8 frames executa o ciclo completo de passadas esquerda e direita.
   - Validar `getOutfitLayerUrls` para `f0` a `f8`.
2. Executar `npm run typecheck` (0 erros).
3. Executar suíte completa no Vitest (100% de aprovação).
