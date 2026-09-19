# Fase 213: Transferência Automática de Líder/Câmera na Morte e Bloqueio de XP para Personagens Mortos

**Status:** Concluído ✅  
**Data:** 19/09/2026  
**Tipo:** Fix / Feature / Mechanics  

## Resumo Executivo

Nesta fase, implementamos de ponta a ponta o tratamento estrito de morte em grupo (party) durante caçadas e combate idle/multiplayer, atendendo rigorosamente às diretrizes do `FIX.md`:
1. **Bloqueio total de XP para personagens mortos:**
   - Personagens cujo estado de vida seja 0 (`currentHp <= 0` ou `actor.alive === false`) não recebem qualquer experiência, não avançam de nível e não disparam eventos de recepção de XP.
   - O rate de divisão de experiência em `sharedExperiencePerCharacter` é recalculado apenas entre os sobreviventes vivos da party, permitindo que eles continuem acumulando experiência e progredindo normalmente.
   - Bloqueio preventivo no servidor autoritativo (`ThaisCityRoom.ts`) garantindo que jogador com vida 0 não receba XP de monstros abatidos.
2. **Transferência automática de líder, foco e câmera ao morrer:**
   - Implementada a função `transferActiveMemberOnDeath` em `packages/domain/src/combat.ts`, acionada imediatamente quando qualquer personagem sofre golpe fatal (`target.hp <= 0`).
   - Critério de eleição do sucessor: busca o membro vivo sobrevivente com **maior nível decrescente**, utilizando maior experiência atual e ID estável como critérios de desempate.
   - Se o personagem morto era o selecionado ou o alvo da câmera, `selectedCharacterId` e `cameraTargetCharacterId` são automaticamente atualizados para o sucessor vivo, fazendo a câmera do `PixiArena` focar nele e o HUD/console exibir suas habilidades e vida.
   - Se o personagem morto era o líder da party (`leaderId`), a liderança é formalmente transferida com log de anúncio (`addLog`) e emissão do evento `'leader-transferred'`.

---

## Arquivos Modificados e Criados

1. **`packages/domain/src/party.ts`**:
   - `sharedExperiencePerCharacter`: Adicionada verificação de guarda `if (characters.length === 0) return 0;`.
2. **`packages/domain/src/combat.ts`**:
   - `grantSharedExperience`: Filtragem de membros vivos antes de calcular e conceder XP compartilhada.
   - `rollLoot`: Filtro de membros vivos para entrega de drops individuais.
   - `transferActiveMemberOnDeath`: Lógica determinística de seleção do membro vivo de maior nível e transferência de `selectedCharacterId`, `cameraTargetCharacterId` e `leaderId`.
   - `enemyAttacks`: Sincronização antecipada e acionamento de `transferActiveMemberOnDeath` ao detectar `target.hp <= 0`.
3. **`packages/server/src/rooms/ThaisCityRoom.ts`**:
   - Validação de `killer.hp > 0` ao abater criaturas em Thais, impedindo ganho de XP após a morte.
4. **`tests/phase213-party-death-and-xp-transfer.test.ts`** [NOVO]:
   - 6 testes unitários cobrindo todos os cenários (100% de aprovação no Vitest).
5. **`FIX.md`**:
   - Atualizados os itens de morte e XP na party para `[CONCLUÍDO - Fase 213]`.

---

## Verificação e Qualidade

- **Testes Unitários:** 6/6 testes aprovados em `tests/phase213-party-death-and-xp-transfer.test.ts`.
- **Regressão:** 30/30 testes aprovados em `domain.test.ts`, `continuous-hunt.test.ts` e `party-economy-camera.test.ts`.
- **Typecheck:** 0 erros com TypeScript 5.9 (`npm.cmd run typecheck`).
