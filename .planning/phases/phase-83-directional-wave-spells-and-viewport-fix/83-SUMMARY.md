# Phase 83: Diagnóstico e Correção de Tela Preta no Viewport e Magias Direcionais em Onda (Exevo Flam Hur / Fire Wave) - Summary

## Visão Geral

- **Objetivo**:
  1. Corrigir a tela preta no viewport do PixiJS (`ThaisCityArena`) que ocorria ao carregar o jogo, decorrente do enfileiramento não particionado de 2.500+ texturas no `Promise.allSettled` antes de anexar o mundo ao palco.
  2. Implementar a mecânica autêntica do Tibia 8.60 para magias direcionais em onda (Wave Spells, em especial `Fire Wave` / `exevo flam hur`), substituindo o comportamento errôneo anterior de projétil teleguiado em alvo único pela propagação em cone direcional de 17 SQMs na direção que o conjurador estiver olhando.

## Entregas Realizadas

### 1. Geometria Canônica de Onda Direcional (`packages/domain/src/spells.ts`)
- Implementada a matriz canônica de 17 SQMs `WAVE_4_PATTERN` distribuída em 5 fileiras a partir do conjurador:
  - Fileira 1 (à frente): 1 SQM (centro)
  - Fileira 2: 3 SQMs (-1, 0, +1)
  - Fileira 3: 3 SQMs (-1, 0, +1)
  - Fileira 4: 5 SQMs (-2, -1, 0, +1, +2)
  - Fileira 5: 5 SQMs (-2, -1, 0, +1, +2)
- Criadas as funções `getWave4Tiles`, `getDirectionalSpellTiles` e `getSpellAreaTiles`, suportando rotação exata nas 4 direções cardeais (`north`, `south`, `east`, `west`).

### 2. Motor de Combate e Disparo em Área (`packages/domain/src/combat.ts`)
- Em `castAutomaticSpells` e `triggerManualHotbarAction`:
  - Se houver alvo, o conjurador alinha a sua direção cardeal (`actor.direction`) em direção ao alvo antes de disparar.
  - O cálculo da área filtra todos os inimigos presentes dentro dos 17 SQMs da onda direcional.
  - Para cada um dos 17 SQMs, emite um evento visual `spell-visual` com `targetPosition` e `projectileId: null`, exibindo a explosão de chamas simultânea sem lançar projétil teleguiado.
  - Dano aplicado em área para todos os monstros dentro do cone.

### 3. Servidor de Jogo Multiplayer (`packages/server/src/rooms/ThaisCityRoom.ts`)
- Em `handleCastSpell`:
  - Suporte completo a `exevo flam hur` (e ID 19 / `fire-wave`).
  - Consumo de 25 de mana, fala do feitiço, emissão de `spell_area` nos 17 SQMs com efeito de fogo (`effectId: 16`), cálculo de dano nos monstros na área (como Target Dummies) e progresso de Magic Level.

### 4. Correção Definitiva da Tela Preta no Viewport (`apps/web/components/ThaisCityArena.tsx`)
- Desacoplada a montagem do palco Pixi: contêineres `world`, camadas de terreno, objetos, atores e efeitos são criados e anexados imediatamente ao `app.stage` no início.
- Pré-carregamento prioritário de assets essenciais em lotes controlados (<50 URLs prioritárias carregadas em ~50ms), seguido de streaming das texturas secundárias em segundo plano.
- Adicionado listener de rede para eventos de combate com renderização visual de efeitos e wands no ambiente urbano.

## Validação e Qualidade

- **Testes Unitários e de Integração**:
  - Criado `tests/phase83-directional-wave-spells-and-viewport.test.ts` validando os 17 SQMs nas 4 direções cardeais, ausência de projétil e dano restrito ao cone da onda.
  - 86 suítes de teste (470 testes aprovados, 100% de sucesso no Vitest).
- **Tipagem TypeScript**:
  - `npm run typecheck` executado com 0 erros.
