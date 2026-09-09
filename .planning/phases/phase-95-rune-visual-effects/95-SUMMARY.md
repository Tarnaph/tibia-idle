# Phase 95 Summary: Efeitos Visuais, Projéteis e Áreas de Impacto Autênticas de Runas via RealMap 11

## 1. Visão Geral e Contexto
Nesta fase, realizamos a auditoria completa e o alinhamento autoritativo de **100% dos efeitos visuais (`effectId`)** e **projéteis/mísseis (`projectileId`)** de todas as 34 runas canônicas do jogo contra os scripts Lua de `realmap11/data/spells/scripts/` e as constantes de enumeração de `realmap11/src/const.h`.

Foram corrigidas diversas discrepâncias históricas do cadastro:
- **Sudden Death (2268):** antes usava efeito 16 / míssil 5; agora utiliza com total fidelidade o efeito **18** (`CONST_ME_MORTAREA`) e projétil **32** (`CONST_ANI_SUDDENDEATH`).
- **Avalanche (2274):** antes usava projétil 37; agora utiliza com fidelidade o projétil **29** (`CONST_ANI_ICE`) e efeito **42** (`CONST_ME_ICEAREA`).
- **Great Fireball (2304):** antes usava efeito 37; agora utiliza o efeito **7** (`CONST_ME_FIREAREA`) e projétil **4** (`CONST_ANI_FIRE`).
- **Explosion (2313):** antes usava efeito 10 / míssil 4; agora utiliza efeito **5** (`CONST_ME_EXPLOSIONAREA`) e míssil **41** (`CONST_ANI_EXPLOSION`) com área em cruz 1x1 (`AREA_CROSS1X1`).
- **Thunderstorm (2315):** antes usava efeito 38 / míssil 5; agora utiliza efeito **12** (`CONST_ME_ENERGYHIT`) e míssil **36** (`CONST_ANI_ENERGYBALL`) com área circular 3x3 (`AREA_CIRCLE3X3`).
- **Stone Shower (2288):** antes usava míssil 5; agora utiliza efeito **45** (`CONST_ME_STONES`) e míssil **30** (`CONST_ANI_EARTH`) com área circular 3x3 (`AREA_CIRCLE3X3`).
- **Icicle (2271):** efeito **42** (`CONST_ME_ICEAREA`) e míssil **29** (`CONST_ANI_ICE`).
- **Fireball (2302):** efeito **37** (`CONST_ME_FIREATTACK`) e míssil **4** (`CONST_ANI_FIRE`).
- **Stalagmite (2292):** efeito **45** (`CONST_ME_STONES`) e míssil **30** (`CONST_ANI_EARTH`).
- **Holy Missile (2295):** efeito **40** (`CONST_ME_HOLYDAMAGE`) e míssil **31** (`CONST_ANI_HOLY`).
- **Heavy Magic Missile (2311) & Light Magic Missile (2287):** efeito **38** (`CONST_ME_ENERGYAREA`) e míssil **5** (`CONST_ANI_ENERGY`).
- **Fire Bomb (2305):** efeito **16** (`CONST_ME_HITBYFIRE`), míssil **4** (`CONST_ANI_FIRE`) em área 1x1 quadrada (9 tiles).
- **Poison Bomb (2286):** efeito **9** (`CONST_ME_GREEN_RINGS`), míssil **15** (`CONST_ANI_POISON`) em área 1x1 quadrada (9 tiles).
- **Energy Bomb (2262):** efeito **12** (`CONST_ME_ENERGYHIT`), míssil **36** (`CONST_ANI_ENERGYBALL`) em área 1x1 quadrada (9 tiles).
- **Paralyze (2278):** efeito **14** (`CONST_ME_MAGIC_RED`), sem projétil.
- **Destroy Field (2261) & Desintegrate (2310):** efeito **3** (`CONST_ME_POFF`), sem projétil.
- **Chameleon (2291):** efeito **14** (`CONST_ME_MAGIC_RED`), sem projétil.
- **Convince Creature (2290), Animate Dead (2316), UH (2273), IH (2265), Antidote (2266), Blank Rune (2260):** efeito **13** (`CONST_ME_MAGIC_BLUE`).
- **Magic Wall (2293):** míssil **5** (`CONST_ANI_ENERGY`), efeito 0.
- **Wild Growth (2269):** míssil **30** (`CONST_ANI_EARTH`), efeito 0.

## 2. Detonação Sincronizada de Mísseis e Áreas de Impacto
No Tibia clássico, quando um jogador dispara uma runa de área (GFB, Avalanche, Thunderstorm, Stone Shower, Explosion, etc.):
1. Um projétil único viaja do lançador até a criatura / tile primário alvo (~240ms).
2. No momento em que o projétil atinge o centro da área, todos os tiles da área detonam a animação de impacto e o dano é causado simultaneamente nos inimigos no raio de ação.

Implementações realizadas:
- **`packages/domain/src/types.ts`**: Adicionado campo opcional `delayMs?: number` ao evento de combate `spell-visual`.
- **`packages/domain/src/combat.ts`**:
  - Adicionadas matrizes canônicas de offsets de área: `CIRCLE_3X3_OFFSETS` (37 tiles de `AREA_CIRCLE3X3`), `CROSS_1X1_OFFSETS` (5 tiles de `AREA_CROSS1X1`), `SQUARE_1X1_OFFSETS` (9 tiles de `AREA_SQUARE1X1`).
  - Tanto no disparo automático (`advanceCombat`) quanto no disparo manual (`triggerManualHotbarAction`), runas de área lançam 1 projétil ao alvo principal e disparam os efeitos de impacto em todos os tiles atingidos com `delayMs: 240` (caso haja projétil) ou `0` (efeitos instantâneos).
- **`apps/web/components/PixiArena.tsx`**: O método `addSpellVisual` agora respeita `event.delayMs`, ocultando o sprite (`root.visible = false`) até a chegada do temporizador (`progress >= 0`).
- **`apps/web/components/ThaisCityArena.tsx`**:
  - O loop de renderização da cidade agora pré-carrega todas as spritesheets de mísseis (`visualAssets.missiles`) e efeitos (`visualAssets.effects`), eliminando qualquer possibilidade de sprites vazios ou atrasos de GPU.
  - O processamento de eventos `spell-visual` suporta `projectileId` e temporização sincronizada de `delayMs`.
- **`packages/realmap11-importer/src/importSpells.ts`**: Adicionado o mapeamento completo de constantes de `realmap11/src/const.h` aos dicionários `effectIds` e `projectileIds`.

## 3. Preservação Estrita e Garantias
- **Ícones de Runas (Phase 94):** 100% preservados, com todas as 34 runas exibindo a sprite oficial do item em `/runes/${slug}.png` e `/generated/tibia1098/items/item-${id}.png` na lista, nos detalhes, no inventário e na barra de ações.
- **Magias de Sorcerer (Phase 93):** Todos os ícones oficiais do Tibia 11 RCC permanecem intactos.
- **Poções e Elixires (Phases 91-92):** Animações APNG de 12 frames, travas de nível e ausência de contagem de quantidade preservados.
- **Regras de Combate e Fórmulas:** Preservadas sem alterações na matemática de dano.

## 4. Verificação e Testes
- **Suíte de Testes da Fase:** `tests/phase95-rune-visual-effects.test.ts` criada e validada com 8/8 testes aprovados.
- **Suíte Completa:** 96 test suites, **505 testes passando** com 100% de aprovação.
- **Typecheck:** `npm run typecheck` com **0 erros de tipagem**.
