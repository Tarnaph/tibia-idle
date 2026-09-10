# Phase 117 Summary: Pipeline Autêntico de Animação Tibia 10.98 (Idle Frame 0 Canônico e Ciclo Completo de Caminhada com 8 Frames)

## Status: Complete
**Data:** 2026-09-10
**Duração:** Execução autônoma completa
**Testes:** 8/8 novos testes passando em `tests/phase117-idle-pose-and-8frame-walk.test.ts` (100% de sucesso em toda a suíte de arena visual).
**Typecheck:** 0 erros de TypeScript (`npm run typecheck`).

---

## 1. Diagnóstico e Causa Raiz Descoberta

Através de inspeção direta dos binários de sprites do cliente Tibia 10.98 (`Tibia.dat` e `Tibia.spr`), decodificando looktypes (Citizen 128, Knight 131 e montarias), comprovamos a causa exata dos dois problemas reportados:

1. **Por que o personagem parado ficava com uma perna para a frente:**
   - No Tibia 10.98, cada criatura/outfit possui dois grupos de frames no `.dat`:
     - **`FrameGroup 0 (Idle)`**: Pose canônica de repouso (1 frame). Ambos os pés firmes, juntos e retos no chão.
     - **`FrameGroup 1 (Moving)`**: Sequência de caminhada fluida (8 frames). O frame 0 desse grupo é o início do passo com a perna esticada.
   - O extrator original (`extract-complete-appearances.mjs`) lia apenas o `FrameGroup 1 (Moving)` e ignorava o `FrameGroup 0 (Idle)`.
   - Ao salvar no disco como `f0`, gravou o frame 0 do grupo de movimento (perna esticada). A pose de repouso genuína do Tibia **nunca havia sido extraída para o disco**.
2. **Por que a caminhada parecia incompleta:**
   - A caminhada autêntica do Tibia 10.98 possui **8 frames sequenciais**:
     - `f1..f4`: Passada da perna esquerda avançando e voltando ao centro.
     - `f5..f8`: Passada da perna direita avançando e voltando ao centro.
   - O extrator antigo truncava em apenas 3 frames (`Math.min(app.frames, 3)`), descartando 5 dos 8 frames da animação.
   - O frontend executava `walkCycle = [0, 1, 0, 2]`, alternando apenas fragmentos do passo da perna esquerda e voltando abruptamente, sem nunca dar o passo da perna direita.

---

## 2. Soluções Implementadas

### 1. Reestruturação do Pipeline de Extração (`scripts/extract-complete-appearances.mjs`)
- **Separação Canônica de FrameGroups:**
  - `idleGrp`: `FrameGroup 0` (Idle) -> extrai `f0` para Base, Mask, Addon 1, Addon 2 e Mount Rider.
  - `movingGrp`: `FrameGroup 1` (Moving) -> extrai todos os 8 frames da caminhada CipSoft como `f1` a `f8` para todas as camadas.
  - Para as montarias (`mounts`): `f0` extraído do `mIdleGrp` (4 patas apoiadas no chão) e `f1..f8` extraídos do `mMovingGrp` (8 frames de galope/passo).
- **Regeneração Completa:**
  - Extraídos e gravados com sucesso no disco todos os 76 outfits canônicos e 129 montarias oficiais em `public/generated/outfits/` e `public/generated/mounts/`.
  - Thumbnails oficiais agora utilizam o `f0` (pose de repouso clássica).

### 2. Atualização da Camada de Texturas (`apps/web/lib/outfitRecolor.ts`)
- `getOutfitLayerUrls`: atualizado `safeFrame` para aceitar frames de 0 a 8 (`Math.max(0, Math.min(8, frame))`).
- `preloadOutfitAllFrames`: atualizado para pré-carregar os frames `[0, 1, 2, 3, 4, 5, 6, 7, 8]`.

### 3. Motores de Renderização PixiJS (`ThaisCityArena.tsx` e `PixiArena.tsx`)
- **Estado Parado:** Quando `!charIsMoving` (ou `!sample.moving`), o frame é **garantidamente 0** (`f0` = repouso com os dois pés juntos no chão).
- **Estado Andando:** Quando `charIsMoving`, executa o ciclo completo de 8 frames da CipSoft:
  - Em `ThaisCityArena.tsx`:
    `const walkCycle8 = [1, 2, 3, 4, 5, 6, 7, 8];`
    `const stepRateMs = Math.max(25, Math.floor(curStepDuration / 8));`
    `const charWalkFrame = charIsMoving ? walkCycle8[Math.floor(now / stepRateMs) % 8] : 0;`
  - Sincronizado para jogador local e jogadores remotos.
  - Em `PixiArena.tsx` (caçada):
    `const walkFrame = sample.moving ? (1 + (Math.floor(framePhase * 8) % 8)) : 0;`

---

## 3. Verificação e Testes

- `npm.cmd run typecheck`: **0 erros de tipagem**.
- `npx.cmd vitest run tests/phase117-idle-pose-and-8frame-walk.test.ts`: **8/8 testes aprovados**.
- `npx.cmd vitest run tests/phase116-auth-security-and-idle-pose.test.ts tests/phase117-idle-pose-and-8frame-walk.test.ts`: **16/16 testes aprovados**.
- Suíte completa de renderização visual (phase 34, 55, 65, 115): **22/22 testes aprovados**.
