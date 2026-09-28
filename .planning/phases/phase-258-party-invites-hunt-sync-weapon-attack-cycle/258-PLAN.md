# Phase 258: Convites de Party Multiplayer em Thais, Transição Contínua para Hunt em Grupo (Sem Clones) e Desacoplamento do Auto-Ataque com Magias

## Objetivo Geral
Resolver integralmente os 3 desafios de jogabilidade e multiplayer definidos no FIX.md:
1. Reativação autoritativa do envio e recepção de convites de Party entre jogadores reais em Thais City (`CityPartyHandler.ts`).
2. Desacoplamento canônico do auto-ataque com armas (Bows/Crossbows, Wands/Rods, Melee) de magias ofensivas e runas em `packages/domain/src/combat.ts`, permitindo flecha + magia no mesmo turno.
3. Transição contínua e sincronizada para caçada em grupo para o seguidor (na conclusão da tela de loading), IA tática de grupo e isolamento total sem clones em Thais.

---

## Ondas de Execução

### Onda 1: Reativação Autoritativa de Convites de Party Multiplayer (`CityPartyHandler.ts`)
- Reativar `party:invite` em `packages/server/src/rooms/handlers/CityPartyHandler.ts`.
- Localizar jogador alvo conectado em Thais por nome (`data.targetName`), case-insensitive:
  - Validar se o alvo existe e está online na sala.
  - Validar se o autor não está tentando convidar a si mesmo.
  - Validar se o grupo já não atingiu o limite de 4 jogadores.
- Disparar `targetClient.send('party:invitationReceived', { inviterSessionId, inviterName, inviterLevel, inviterVocationId })`.
- Disparar `client.send('party:inviteSent', { targetName: targetPlayer.name })` ou log no chat do líder.
- Garantir que ao aceitar (`party:acceptInvite`), ambos os jogadores fiquem sincronizados na mesma party (`broadcastPartySync`).

### Onda 2: Desacoplamento do Auto-Ataque com Armas e Magias Ofensivas (`combat.ts`)
- Em `packages/domain/src/combat.ts`:
  - Na função `castAutomaticSpells`: remover `actor.nextAttackAt = encounter.elapsedMs + spell.groupCooldownMs;` e `actor.groupCooldowns['attack'] = ...` ao disparar magia ofensiva.
  - Na função `triggerManualHotbarAction`: remover a trava correspondente no disparo manual de magias ofensivas e runas.
  - No uso de runas: remover o adiamento de `actor.nextAttackAt`.
  - Manter estritamente o relógio de ataque da arma (`stats.attackIntervalMs` / 2000ms) sem interrupção por magias.
  - Garantir que a renderização visual (`PixiArena.tsx`) processe tanto o projétil da arma quanto o projétil/efeito da magia no mesmo tick.

### Onda 3: Transição Fluida para Caçada em Grupo e Zero Clones
- Em `apps/web/components/GamePrototype.tsx`:
  - No `onFinish` da tela de transição de loading (`ExuraLoadingScreen`), garantir que o seguidor acione `setGame((current) => restartHunt(prepareHuntCharacters(current), pending.nextSeed, content, pending.huntId, pending.pullSize ?? 'cauteloso'))` e `setMode('hunt')`.
  - Preservar o isolamento urbano: jogadores em caçada enviam `player:setInHunt { inHunt: true, huntId }`, garantindo que não sejam desenhados em Thais City (`posZ: 8` e filtro `inHunt`).
  - No encerramento da caçada (`exitHunt` / `party:huntExit`), salvar progresso de ambos e restaurar com segurança para o Templo de Thais (`32369, 32241, 7`).

### Onda 4: Validação, Testes Vitest, Typecheck e Deploy
- Rodar `npm run typecheck` e garantir 0 erros de tipagem.
- Criar suíte de testes Vitest dedicada `tests/phase258-party-invites-hunt-sync-weapon-attack.test.ts`.
- Executar `npm run test` e garantir 100% de aprovação.
- Atualizar `FIX.md`, `ROADMAP.md` e `STATE.md`.
- Realizar deploy na VPS (`node scripts/deploy.mjs`).
