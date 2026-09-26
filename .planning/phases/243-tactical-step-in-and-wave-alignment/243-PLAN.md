# Phase 243: IA Tática de Posicionamento e Combate (Step-In para Strikes & Alinhamento Cardinal de Waves com Knight na Box)

## Goal
Implementar inteligência tática avançada de combate e posicionamento para personagens da party:
1. **Step-In & Cast (Avanço Tático para Strikes e Magias Curtas):**
   - Personagens de ataque à distância (Sorcerer, Druid, Paladin) que normalmente mantêm distância 4 (wand/rod/arco), ao terem uma magia ofensiva de strike com alcance menor (ex: `Exori Flam`, `Exori Vis`, `Exori Hur` com range 3) pronta para uso (sem cooldown de spell nem cooldown de ataque e com mana suficiente), avançam 1 SQM tático até a distância 3 para disparar a magia.
   - Assim que a magia for disparada e entrar em cooldown, a distância tática preferida volta para 4, mantendo o kiting seguro caso o monstro tente se aproximar.
2. **Alinhamento Cardinal Tático para Waves com Knight na Box (Line-up Tático):**
   - Quando um mago (Sorcerer ou Druid) tem uma magia direcional de onda (ex: `Fire Wave`, `Energy Wave`, `Ice Wave`, `Terra Wave`) pronta ou prestes a ficar pronta na hotbar, e há um Knight na party engajado com monstros agrupados ao redor (box ou cluster), o mago busca ativamente um tile alinhado cardinalmente (mesmo X ou mesmo Y do Knight/centro do cluster) em distância segura (2 a 4 SQMs).
   - O mago vira na direção do Knight/box e dispara a wave em linha reta, varrendo a box inteira e atingindo o número máximo de criaturas.

## Implementation Details

### 1. `packages/domain/src/combat.ts`:
- Em `attackRange(characterId: string, state: CombatState, content: ContentRegistry)`:
  - Adicionar suporte para verificar se o atacante possui ações de hotbar ativas com magias ofensivas direcionadas (`spell.group === 'attack'`, `spell.area === 'target'`, `spell.range < weaponRange`).
  - Se a magia estiver pronta (`actor.mana >= spell.mana`, `elapsedMs >= actor.spellCooldowns[spellId]`, `elapsedMs >= actor.groupCooldowns['attack']`), o range desejado de aproximação passa a ser `spell.range` (ex: 3) em vez de 4.
  - Caso contrário, mantém o range canônico de armas à distância (4).

### 2. `packages/domain/src/spatial/movement.ts`:
- Suporte a cardinal wave line-up no cálculo de movimento de personagens ranged com waves ativas:
  - Detectar se o personagem possui magia de wave ofensiva direcional pronta (`isDirectionalSpell(spell)` e pronta para cast).
  - Identificar o ponto focal de agrupamento de monstros (ex: posição do Knight da party que está com inimigos adjacentes, ou centro de massa de um cluster de 2+ monstros).
  - Ao calcular os tiles de aproximação viáveis (`approachTiles`), priorizar fortemente tiles que compartilham a mesma linha (mesmo X ou mesmo Y) com o ponto focal e que possuam linha de visão livre até o alvo, permitindo que a wave atravesse o grupo de monstros.

### 3. Verification & Testing:
- `tests/phase243-tactical-step-in-and-wave-alignment.test.ts`:
  - Testar que Sorcerer a distância 4 avança para distância 3 quando `Exori Flam` está pronto.
  - Testar que ao entrar em cooldown, o range desejado retorna a 4.
  - Testar que mago com `Fire Wave` busca alinhamento cardinal relativo ao Knight com monstros adjacentes.
  - Garantir 100% dos testes aprovados no Vitest e 0 erros no TypeScript.

## Deployment:
- Commit atômico com mensagem convencional.
- Deploy na VPS `187.7.16.210` via script SSH.
