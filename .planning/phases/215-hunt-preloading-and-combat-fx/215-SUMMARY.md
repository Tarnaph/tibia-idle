# Phase 215 Summary: Hunt Preloading & Combat FX Fixes

## 🎯 Objetivos Concluídos
1. **Regra e Sistema de Pré-Carregamento Real na Tela de Loading (Hunts & PvP):**
   - Criada a regra obrigatória canônica em `.agents/rules/hunt-loading-and-assets.md` que estabelece que qualquer transição para Caçadas ou Arena PvP DEVE utilizar o tempo do `ExuraLoadingScreen` para efetivamente carregar o mapa, atlas de texturas dos tiles (`hunt-${huntId}-atlas.json` e `.png`), sprites/frames de todas as direções dos monstros e efeitos de combate essenciais.
   - Criado o serviço `apps/web/lib/huntAssetPreloader.ts` com cache de imagens, carregamento em lotes e notificação de progresso.
   - Atualizado `apps/web/components/GamePrototype.tsx` em `startSelectedHunt` e `handleStartPvPDuel` para instanciar a caçada e o motor de renderização sob o loading, garantindo que o cenário e os monstros já cheguem 100% desenhados e prontos na GPU quando a tela de loading se fecha.

2. **Efeitos Visuais de Combate Físico Melee (Knight Sword) & Magias no PixiArena:**
   - Em `packages/domain/src/combat.ts`: `playerAttacks` agora emite `melee-hit` com `effectId: 1` (sangue espirrando / draw blood) em acertos que causam dano (`damage > 0`) e `effectId: 4` (faísca de bloqueio de escudo / puff) em ataques bloqueados (`damage <= 0`).
   - Em `apps/web/components/PixiArena.tsx`: expandido o conjunto de `priorityUrls` para pré-carregar imediatamente todos os efeitos essenciais de combate (`ESSENTIAL_COMBAT_EFFECT_IDS`, incluindo o efeito 10 de área física/exori, 12 de cura, 13 de taunt, etc.) e mísseis (`ESSENTIAL_COMBAT_MISSILE_IDS`).
   - Implementado fallback resiliente com `Texture.from(frameUrl)` nos efeitos e visualEvents, impedindo instâncias de sprites com textura indefinida/invisível.

3. **Correção Canônica do Ícone e Sprite do Cyclops Smith (64x64):**
   - Extraído o lookType 277 oficial dos arquivos Tibia.dat e Tibia.spr (Tibia 10.98), gerando o sprite completo em 64x64 pixels com martelo e armadura.
   - Atualizados `public/generated/bestiary/cyclops-smith.png` e `public/generated/tibia1098/monster-cyclops-smith-thumb.png`.
   - Adicionado mapeamento em `scripts/extract-bestiary-sprites.mjs` e recompilado o atlas `public/generated/atlases/hunt-cyclops-camp-atlas.png` e `.json`.

4. **Correção do Exori (Berserk) & Prevenção de Cooldown Fantasma:**
   - Em `packages/domain/src/combat.ts`:
     - Em `castAutomaticSpells`: se `targets.length === 0` dentro do alcance de 1 SQM para magias com `area: 'square-1x1'`, o ciclo dá `continue;`, impedindo que o knight gaste mana no vazio e fique num loop perpétuo de reinício de cooldown enquanto anda até o monstro.
     - Em `triggerManualHotbarAction`: corrigido `SQUARE_1X1_OFFSETS` para os 8 tiles vizinhos ao redor do personagem (preservando `SQUARE_1X1_WITH_CENTER_OFFSETS` com 9 tiles para Exeta Res). O cast manual projeta a animação autêntica nos 8 tiles e debita mana normalmente.

---

## 🧪 Validação e Testes
- **Suíte de Testes da Fase:** `tests/phase215-hunt-preloading-and-combat-fx.test.ts` (6/6 testes aprovados - 100%).
- **Suíte de Regressão:** `tests/phase24-exori-area.test.ts`, `tests/phase214-exeta-res-and-phantom-cooldown.test.ts`, `tests/phase22-combat-authenticity.test.ts` (15/15 testes aprovados - 100%).
- **TypeScript Typecheck:** `npm run typecheck` executado em todo o monorepo com 0 erros (`The command exited with code 0`).
- **Registro em FIX.md:** Todos os 4 tópicos resolvidos e validados.
