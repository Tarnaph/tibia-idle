# Phase 124: Sistema de Exhaust (Mutual Delay Magia/Poção), IA de Exploração Solo e Táticas Cooperativas de Party — Resumo de Entrega

## 🎯 Objetivo Concluído
Implementação completa dos 3 requisitos solicitados em `FIX.md`:
1. **Sistema Canônico de Exhaust (Exclusão Mútua & Cross-Cooldown 1000ms):**
   - Intervalo estrito de 1000ms entre consumir poções e conjurar magias ou runas.
   - Exclusão mútua por tick (`usedPotionThisTick` e `usedSpellThisTick`), impedindo qualquer combinação simultânea de poção com magia/runa no mesmo instante.
   - Aplicação em combate automático (`castAutomaticSpells`), acionamento manual (`triggerManualHotbarAction`) e poção de emergência (`triggerEmergencyAutoPotion`).
2. **IA de Caçada Solo Inteligente (Dynamic Cave Monster Seeking):**
   - Na caçada solo, quando o jogador não visualiza monstros vivos no caminho imediato ou no campo de visão, a IA não caminha até waypoints vazios nem fica ociosa.
   - Busca dinamicamente os monstros vivos mais próximos em qualquer sala ou corredor da caverna e recalcula a rota para engajá-los.
3. **IA Tática Avançada de Party (Tank Knight, Healer Druid & Ranged DPS):**
   - **Knight (Main Tank):** Lidera na vanguarda da marcha (`partyKnight` como ponta de lança); foca no monstro vivo mais próximo; detecta quando monstros atacam aliados ou se aproximam da retaguarda e conjura `Challenge` (`exeta res` com custo 30 de mana, fala em amarelo e efeito visual azul 13), forçando o aggro dos inimigos para si por 6000ms (`challengedTargetId`, `challengedUntil`).
   - **Druid (Healer / Suporte):** Mantém distância tática de 3 a 4 tiles (`minRange: 3`, `attackRange: 4`); prioriza continuamente curar o Knight com `Heal Friend` (`exura sio`, spellId 84) quando o Knight estiver abaixo de 85% de HP, e aliados abaixo de 80% de HP, antes de desferir magias ofensivas; age primeiro na rodada de magias para sustentar o grupo.
   - **Sorcerer & Paladin (Ranged DPS):** Mantêm distância tática estrita de 3 a 4 tiles (`minRange: 3`, `attackRange: 4`), recuando e reposicionando-se caso os monstros se aproximem a menos de 3 tiles.
   - **Sincronização de Alvo da Party:** Membros secundários da party sincronizam seus alvos para atacar cooperativamente o mesmo alvo do Knight.

---

## 🛠️ Arquivos Modificados
- `packages/domain/src/types.ts`:
  - Adicionados `challengedTargetId?: string | null;` e `challengedUntil?: number;` à interface `EnemyState`.
- `packages/domain/src/spatial/pathfinding.ts`:
  - `findRangedApproachTiles`: suporte a `minRange` para posicionamento tático à distância (3-4 tiles).
- `packages/domain/src/spatial/movement.ts`:
  - `nearestActor`: prioriza `challengedTargetId` quando o monstro está desafiado por `exeta res`, e mantém o alvo ativo caso este esteja vivo e em alcance de detecção.
  - `movePartyTowardTargets`: suporte a `minRanges`, posicionamento de vanguarda do Knight, sincronização com alvo do líder e preservação da guarda de multiplayer party.
- `packages/domain/src/party.ts`:
  - Vocations ranged (Druid, Sorcerer, Paladin) configuradas por padrão com `targetDistance = 4`.
- `packages/domain/src/combat.ts`:
  - Funções exportadas: `attackRange`, `minTacticalRange`, `findPartyKnightActor`.
  - `executeKnightChallenge`: conjuração autoritativa de `Challenge` (`exeta res`) quando aliados estão sob ameaça.
  - `castAutomaticSpells`: exclusão mútua por tick entre poções e magias, cross-cooldown de 1000ms, ordenação com healers/Druids agindo primeiro, e prioridade de `exura sio` para o Knight.
  - `playerAttacks`: escolha do inimigo mais próximo pelo Knight e sincronização de alvo para secundários.
  - `advanceContinuousHunt`: exploração solo dinâmica buscando monstros vivos na caverna e marcha com Knight na frente.
- `tests/phase124-exhaust-solo-exploration-party-tactics.test.ts`:
  - 9 testes automatizados cobrindo exhaust de poção/magia, exclusão no tick, IA de caçada solo dinâmica, identificação de Knight e ranges táticos, cast de Exeta res, prioridade de Exura sio e sincronização de foco.
- `tests/phase22-combat-authenticity.test.ts`:
  - Ajustado tempo de teste para respeitar o exhaust de 1000ms entre poção e magia.

---

## 🧪 Verificação e Testes
- `npm run typecheck`: **0 erros de tipagem**.
- Suíte dedicada (`phase124-exhaust-solo-exploration-party-tactics.test.ts`): **9 de 9 testes APROVADOS**.
- Suíte completa do projeto (`npm test`): **125 de 125 arquivos de teste e 705 de 705 testes APROVADOS (100%)**.
