# Phase 258: Convites de Party Multiplayer em Thais, Transição Contínua para Hunt em Grupo (Sem Clones) e Desacoplamento do Auto-Ataque com Magias — Resumo de Execução

## 🎯 Objetivo da Fase
Implementar as soluções definitivas para os 3 desafios críticos da jogabilidade cooperativa e mecânica canônica de combate do jogo:
1. **Reativação e Funcionamento Autoritativo do Convite de Party Multiplayer em Thais City (`CityPartyHandler.ts`).**
2. **Desacoplamento do Auto-Ataque com Armas e Magias Ofensivas (`combat.ts`), permitindo combos de Flecha + Magia e Wand + Magia simultâneos.**
3. **Transição Contínua para Caçada em Grupo para o Seguidor (`GamePrototype.tsx`), garantindo que ambos entrem na mesma arena sob a mesma seed determinística com IA tática de grupo e zero clones deixados em Thais.**

---

## 🛠️ Alterações Realizadas

### 1. Onda 1: Convites de Party Multiplayer Autoritativos (`CityPartyHandler.ts`)
- Substituído o stub de erro por validação completa e autoritativa no Colyseus:
  - Localização do jogador alvo em Thais City por nome (`targetName`), insensível a maiúsculas/minúsculas.
  - Blindagens de validação:
    - Impede que um jogador convide a si mesmo.
    - Garante que apenas o líder possa convidar novos integrantes.
    - Valida o teto de 4 membros na party (tanto no momento do convite quanto no aceite).
    - Impede convidar jogadores que já pertencem à party ou a outro grupo ativo.
  - Disparo de evento de rede `party:invitationReceived` contendo nome, nível e vocação do líder para abrir o `PartyInvitationModal` na tela do convidado.
  - Confirmação de envio `party:inviteSent` para o líder.
  - Sincronização em tempo real via `broadcastPartySync` ao aceitar o convite.

### 2. Onda 2: Desacoplamento do Auto-Ataque com Armas e Magias (`packages/domain/src/combat.ts`)
- Removido o adiamento forçado de `actor.nextAttackAt` e o bloqueio de `actor.groupCooldowns['attack']` durante o disparo de magias ofensivas automáticas (`castAutomaticSpells`), manuais (`triggerManualHotbarAction`) e runas.
- Removido o bloqueio `|| (actor.groupCooldowns['attack'] ?? 0) > encounter.elapsedMs` dentro de `playerAttacks`.
- O relógio da arma (`stats.attackIntervalMs` / 2000ms) agora corre livre e independente de magias.
- O Paladino agora atira flechas/bolts continuamente com o arco enquanto solta magias de ataque (*Exori Con*, *Exori San*).
- O Sorcerer/Druid agora atira wands/rods continuamente enquanto solta magias de ataque (*Exori Flam/Vis/Mort*).
- O Knight desfere ataques corpo a corpo com sua espada/machado/clava continuamente enquanto solta magias (*Exori*).

### 3. Onda 3: Transição Fluida para Caçada em Grupo e Zero Clones (`GamePrototype.tsx`)
- No término do carregamento de 10s da tela de loading (`ExuraLoadingScreen` / `onFinish`), adicionada a chamada de inicialização para o Seguidor:
  ```typescript
  if (modeRef.current !== 'hunt') {
    setGame((current) => restartHunt(prepareHuntCharactersRef.current(current), pending.nextSeed, content, pending.huntId, pending.pullSize ?? 'cauteloso'));
    setMode('hunt');
  }
  ```
- Ambos os jogadores entram na mesma hunt com a mesma seed determinística.
- Ambos vêem todos os personagens do grupo na arena renderizada pelo `PixiArena.tsx`.
- O Knight atua na vanguarda como Tank/Focus Lead (1 sqm) agrando monstros, enquanto Paladino e Mages mantêm distância tática (3+ sqm).
- Mantido o isolamento urbano (`posZ: 8` e `inHunt: true`) enquanto caçam, garantindo que não existam clones parados em Thais.
- Ao sair da caçada (`exitHunt`), ambos retornam em segurança ao templo de Thais (`32369, 32241, 7`) com restauração do modo urbano.

---

## 🧪 Validação Técnica

1. **TypeScript (`npm run typecheck`):**
   - 0 erros em todo o workspace.
2. **Vitest Unit & Integration Tests:**
   - Suíte dedicada criada em `tests/phase258-party-invites-hunt-sync-weapon-attack.test.ts`.
   - 5/5 testes passando com 100% de aprovação.
3. **Controle de Itens do FIX.md:**
   - Itens 12, 13 e 14 marcados como concluídos `[x]`.
