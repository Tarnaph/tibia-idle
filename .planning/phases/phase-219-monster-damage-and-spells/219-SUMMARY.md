# Phase 219: Calibração de Dano de Monstros, Quebra de Escudo e Magias de Criaturas - Summary

**Phase completed on:** 2026-09-21  
**Status:** Complete ✅  
**Tests:** 15/15 vitest tests passing (100% nas suítes de combate e regressão contínua)  
**Typecheck:** 0 erros de tipagem TypeScript  

---

## 🎯 Objetivo da Fase
Calibrar o combate e o poder ofensivo das criaturas de forma autêntica ao Tibia 10.98+ / TFS 1.x:
1. **Dano Físico Realista e Calibração de Defesa:**
   - Personagens com armaduras fracas recebem dano proporcional e punitivo de monstros fortes (como Cyclops).
   - Eliminação da fórmula inflacionada de defesa que bloqueava ataques quase em 100% dos turnos.
2. **Quebra de Escudo (Shield Break):**
   - Um escudo só consegue bloquear ataques de até 2 monstros por turno (janela de 2.000ms).
   - Do 3º monstro em diante no mesmo turno, o escudo é quebrado (`shield broken`), sofrendo ataque físico direto mitigado apenas pela armadura.
3. **Magias e Habilidades Ofensivas de Monstros:**
   - Importação completa de todas as tags `<attack>` de spells e ataques à distância do acervo canônico RealMap 11 (969 monstros reimportados).
   - Monstros disparam magias com alcance (`range`), projéteis visuais e efeitos elementais em área (ex: Fire Wave do Dragon, Great Fireball, pedras de Cyclops Smith).
   - Dano mágico ignora defesa de escudo e armadura física (apenas mitigação elemental ou Utamo Vita absorvem).
4. **Auto-Cura de Monstros (Healing Defenses):**
   - Criaturas que possuem tags `<defense name="healing">` no XML utilizam cura periódica quando feridas, emitindo efeito visual verde (`CONST_ME_MAGIC_GREEN`).

---

## ⚙️ Especificação Implementada

### 1. Fórmulas de Defesa e Dano Autênticas (TFS 1.x / Tibia 10.98+)
- **Bloqueio de Escudo:**
  ```ts
  maxDefBlock = Math.round(((defenseSkill * (defenseValue * 0.05)) + (defenseValue * 0.04)) * vocation.defenseMultiplier);
  ```
  - Se desarmado e sem escudo, defesa é 0.
  - Bloqueio consome 1 carga por monstro atacante, até o limite de 2 bloqueios por turno (2s).
- **Redução por Armadura:**
  ```ts
  minArmor = Math.floor(armor * 0.475);
  maxArmor = Math.floor(armor * 0.95);
  finalDamage = Math.max(0, damageAfterShield - rollInteger(rng, minArmor, maxArmor));
  ```
- **Magias de Criaturas:**
  - Testadas periodicamente respeitando chance (`chance`), alcance (`range`) e intervalo (`intervalMs`).
  - Dano não é bloqueável por escudo nem mitigado por armadura física comum.

---

## 📁 Arquivos Modificados & Criados

1. **`packages/content-schema/src/index.ts`:**
   - Adicionados `MonsterAttackKind`, `MonsterCombatType`.
   - Expandida interface `MonsterAttackDefinition` (range, radius, length, spread, target, shootEffect, areaEffect, chance, intervalMs, minDamage, maxDamage).
   - Criada interface `MonsterDefenseDefinition` e adicionado campo `defenses?: MonsterDefenseDefinition[]` em `MonsterDefinition`.
2. **`packages/realmap11-importer/src/importMonsters.ts`:**
   - Criadas rotinas `parseMonsterAttacks` e `parseMonsterDefenses`.
   - Reimportado o catálogo completo de 969 criaturas com ataques mágicos e habilidades ativas.
3. **`content/generated/monsters.json` & `rotworm.json`:**
   - Atualizados com definições completas de ataques e defesas para monstros canônicos.
4. **`packages/domain/src/types.ts`:**
   - Adicionados `shieldBlocksThisTurn?: number;` e `shieldTurnStartAt?: number;` em `PartyActorState`.
   - Adicionados `nextSpellAt?: number;` e `spellCooldowns?: Record<string, number>;` em `EnemyState`.
5. **`packages/domain/src/derivedStats.ts`:**
   - Atualizada a fórmula de `defense` para a regra oficial do Tibia 10.98+.
   - Removida a redução flat residual de 30% em `physicalDamageMitigationPercent`.
6. **`packages/domain/src/combat.ts`:**
   - Criada `applyDamageToPartyActor` unificada com suporte a Utamo Vita, auto-potions, sincronização de HP/MP e morte.
   - Implementadas rotinas de auto-cura de monstros e conjuração de magias/ataques à distância.
   - Implementada quebra de defesa de escudo a partir do 3º atacante por turno.
7. **`tests/phase219-monster-damage-and-spells.test.ts`:**
   - Suíte com 5 testes unitários cobrindo dano calibrado, quebra de escudo, magias de monstros, auto-cura e Utamo Vita.
8. **`tests/continuous-hunt.test.ts`:**
   - Atualizada asserção do efeito visual de acerto melee para o ID autêntico de sangue 1 (`CONST_ME_DRAWBLOOD`).

---

## 🧪 Verificação e Validação
- **Vitest Unit Tests:**
  - `phase219-monster-damage-and-spells.test.ts`: **5/5 PASS (100%)**
  - `continuous-hunt.test.ts`: **10/10 PASS (100%)**
  - `phase218-rubinot-regeneration-and-rings.test.ts`: **8/8 PASS (100%)**
  - `phase217-exhaust-and-party-persistence.test.ts`: **5/5 PASS (100%)**
  - `phase22-combat-authenticity.test.ts`: **7/7 PASS (100%)**
- **TypeScript Typecheck:** 0 erros.
