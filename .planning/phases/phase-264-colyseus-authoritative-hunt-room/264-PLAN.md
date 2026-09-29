# Phase 264: Arquitetura Definitiva de Caçada Multiplayer no Servidor Colyseus (HuntDungeonRoom) e Sincronização Autoritativa

## 📋 Contexto e Objetivo
O modo multiplayer em caçadas em grupo atualmente apresentava descompasso por tentar sincronizar simulações locais concorrentes em navegadores distintos (Peer-to-Peer híbrido com snapshots de líder e seguidores). Essa abordagem causava congelamento da tela do seguidor na imagem de fundo de carregamento, efeito elástico de passos no líder e movimentação travada dos monstros.

O objetivo da Phase 264 é a virada arquitetural para o modelo **Server-Authoritative**:
1. Quando uma party vai caçar (ex: Cyclops), o servidor Colyseus hospeda a masmorra (`HuntDungeonRoom`).
2. O servidor Colyseus governa os monstros, movimentação, ataques, cálculo de dano, XP e drops em seu loop de 100ms.
3. Ambos os clientes (líder e seguidor) conectam-se à sala como pares iguais.
4. Eliminação definitiva de qualquer bloqueio que prenda o seguidor na tela de loading.
5. Renderização resiliente no PixiJS para membros remotos da equipe sem dependência do banco local de personagens.

---

## 🌊 Ondas de Execução

### Onda 1: Servidor Colyseus - Masmorra Autoritativa (`packages/server/src/rooms/HuntDungeonRoom.ts` & `CityPartyHandler.ts`)
- Configurar `HuntDungeonRoom` com suporte completo a identificador de party (`partyId`), coordenadas de entrada da caçada (Cyclops Camp, etc.) e distribuição de monstros.
- Broadcast de estados (`state.players`, `state.monsters`, `state.combatEvents`).
- Atualização em `CityPartyHandler.ts` para que, ao iniciar caçada de party, o evento `party:huntStarted` envie as opções para conexão imediata à sala autoritativa.

### Onda 2: Conexão e Transição no Cliente Web (`apps/web/lib/colyseusClient.ts` & `GameClientNetworkManager.ts`)
- Adicionar `joinHuntDungeonRoom` em `colyseusClient.ts`.
- No `GameClientNetworkManager.ts`, gerenciar a instância ativa do `huntRoom`, escutando adições, alterações e remoções de jogadores e monstros.
- Despacho de mensagens de ação do jogador (`attack`, `castSpell`, `move`, `leaveHunt`) diretamente para o Colyseus.

### Onda 3: Resolução do Loading e Renderização PixiJS (`GamePrototype.tsx`, `ExuraLoadingScreen.tsx` e `PixiArena.tsx`)
- Eliminar o deadlock no loading: timeout de segurança incondicional de transição de caçada para evitar que a tela permaneça no background.
- Em `PixiArena.tsx`: renderizar sprites de membros da party diretamente pelos atributos do `actor` caso o personagem não conste em `session.characters`, eliminando o skip de renderização.

### Onda 4: Validação Global com Vitest, Typecheck e Deploy na VPS
- Testes automatizados cobrindo a masmorra autoritativa do servidor Colyseus (`tests/phase264-colyseus-authoritative-hunt-room.test.ts`).
- `npm run typecheck` com 0 erros.
- `vitest run` com 100% de testes passando.
- Deploy na VPS com reinicialização dos serviços Colyseus e Web.
