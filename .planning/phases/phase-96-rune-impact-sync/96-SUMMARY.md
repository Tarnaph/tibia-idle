# Phase 96: Sincronização do Impacto de Projéteis, Números de Dano, Redução de HP e Área das Runas

## Status: Complete
**Data de Conclusão:** 2026-09-09  
**Branch:** main  
**Suites de Teste:** 97 suites | 512 testes aprovados (100% passing)  
**TypeScript Typecheck:** 0 erros  

---

## 🎯 Objetivo da Fase
Resolver o dessincronismo visual em que o número de dano e a redução da vida do alvo aconteciam antes do projétil da runa atingir o monstro.
Garantir que:
1. O projétil viaje visualmente do conjurador até o alvo (~240ms).
2. O impacto (explosão visual), o número flutuante de dano e a redução da barra de vida ocorram no frame exato em que o míssil atinge o alvo.
3. Em ataques em área (Great Fireball, Avalanche, Explosion, Stone Shower, Thunderstorm, Bomb runes), todos os monstros atingidos no raio de ação tenham seus números de dano e barras de vida sincronizados simultaneamente com a aterrissagem do míssil.
4. Em ataques consecutivos no mesmo alvo, a barra de vida não oscile (utilizando amortecedor cumulativo de dano pendente).
5. Em golpes fatais, monstros permaneçam visualmente em pé durante o voo do míssil e o corpo/corpse só apareça no momento do impacto.
6. Constante única compartilhada (`RUNE_PROJECTILE_FLIGHT_MS = 240`) sirva como única fonte de verdade para motor e cliente WebGL, evitando qualquer desvio.
7. Preservar integralmente os efeitos corrigidos na Phase 95, os sprites da Phase 94, ícones da Phase 93 e todas as fórmulas e cooldowns de combate.

---

## 🛠️ Implementações Realizadas

### 1. Constante Única Compartilhada (`RUNE_PROJECTILE_FLIGHT_MS`)
- Declarada em `packages/domain/src/hotbarActions.ts` e exportada via `packages/domain/src/index.ts`:
  ```ts
  export const RUNE_PROJECTILE_FLIGHT_MS = 240;
  ```
- Importada e utilizada como fonte de verdade em:
  - `packages/domain/src/combat.ts`: define `impactDelay = rune.projectileId > 0 ? RUNE_PROJECTILE_FLIGHT_MS : 0` tanto para conjuração manual quanto automática.
  - `apps/web/components/PixiArena.tsx`: define a duração do míssil e o início dos efeitos visuais de impacto.

### 2. Contrato de Eventos de Combate (`CombatEvent`)
- Atualizado `packages/domain/src/types.ts` para que o evento `spell-cast` receba `delayMs?: number`.
- `packages/domain/src/combat.ts`:
  - Em conjuração automática de runas, todos os alvos em `targets` recebem `spell-cast` com `delayMs: impactDelay`.
  - Em conjuração manual de runas, todos os alvos em `targets` recebem `spell-cast` com `delayMs: impactDelay`.

### 3. Sincronização Visual e Frame-Perfect no WebGL (`PixiArena.tsx`)
- **Texto Flutuante de Dano:**
  - O texto flutuante de dano agora é criado com `startedAt: now + delay` e `text.visible = delay <= 0`.
  - Durante o voo (`progress < 0`), permanece invisível e parado.
  - No instante exato `now >= startedAt` (impacto), torna-se visível e flutua suavemente para cima (`visual.kind === 'float'`).
- **Barra de Vida sem Oscilação:**
  - Registro de `PendingImpact { targetId, amount, impactAt: now + delay }`.
  - Cálculo de `pendingDamage` acumulando todos os impactos em voo direcionados ao inimigo:
    ```ts
    const pendingDamage = enemy ? pendingImpacts.filter((p) => p.targetId === enemy.id && now < p.impactAt).reduce((sum, p) => sum + p.amount, 0) : 0;
    const visualHp = enemy ? Math.min(enemy.maxHp, Math.max(0, enemy.hp + pendingDamage)) : ...;
    ```
  - Em ataques sucessivos ou simultâneos, a barra de vida permanece estável no valor prévio e dá o salto exato para baixo na chegada de cada projétil, sem oscilações para cima ou saltos precoces.
- **Golpes Fatais e Aparição do Corpo (Corpse):**
  - Monstros derrotados continuam em `liveIds` e têm `view.root.visible = stillFlying` enquanto o míssil estiver a caminho.
  - O sprite do corpo no chão recebe `visibleAfter = pending.impactAt` e `sprite.visible = false` durante o voo.
  - No frame exato do impacto (`now >= impactAt`), o monstro em pé some e o corpo se torna visível simultaneamente à explosão do projétil e ao número vermelho de dano.

---

## 🧪 Verificação e Validação

1. **Testes Unitários da Fase 96 (`tests/phase96-rune-damage-impact-sync.test.ts`):**
   - ✅ `assigns delayMs: 240 to spell-cast event when firing Sudden Death (projectile rune)`
   - ✅ `assigns delayMs: 240 to ALL damaged targets in Great Fireball area blast`
   - ✅ `assigns delayMs: 240 to ALL damaged targets in Avalanche area blast`
   - ✅ `assigns delayMs: 240 to ALL damaged targets in Explosion cross blast`
   - ✅ `assigns delayMs: 240 during automatic combat rune triggering`
   - ✅ `assigns delayMs: 0 for non-projectile runes like Paralyze Rune`
   - ✅ `preserves rune cooldowns, requirements and projectile/effect mappings intact`
   - ✅ `exports shared RUNE_PROJECTILE_FLIGHT_MS = 240 as single source of truth`
   - ✅ `preserves non-oscillating HP calculation across consecutive projectile impacts`
   - ✅ `maintains dying creature view and delays corpse during fatal projectile rune flight`
   *(10 de 10 testes aprovados).*

2. **Bateria Completa de Testes (`npm test`):**
   - 97 suites de teste executadas e 100% aprovadas (512 testes passando).

3. **Verificação Estática de Tipagem (`npm run typecheck`):**
   - 0 erros de tipagem no TypeScript 5.9.
