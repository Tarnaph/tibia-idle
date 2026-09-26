# Phase 246 Plan: Onda 2 - Modularização Arquitetural do Servidor Colyseus

## Objetivo
Desmembrar o monólito `ThaisCityRoom.ts` (2.561 linhas / 104 KB) em Domain Handlers modulares e especializados em `packages/server/src/rooms/handlers/`, preservando 100% dos contratos de mensagens WebSocket, persistência do Prisma e compatibilidade de rede.

## Escopo Técnico
1. **Criação da pasta `packages/server/src/rooms/handlers/`:**
   - `CityMovementHandler.ts`: movimentação, giros (`turn`), customização de aparência/outfit e teleporte administrativo/urbano.
   - `CityChatHandler.ts`: chat local, broadcast world, canais de yell e entrega autoritativa de mensagens privadas (whispers).
   - `CityCombatHandler.ts`: mira de alvos (`attack`), conjuração de magias (`castSpell`), animações de treino e dummies.
   - `CityPvPHandler.ts`: fila ranqueada de PvP (`pvp:queue:join`/`leave`), sincronização de duelos, cálculo de ELO e caveiras.
   - `CityPartyHandler.ts`: propostas e transições de caçadas em grupo, saída para o templo, sincronização de alts e bestiário.
2. **Refatoração Segura de `ThaisCityRoom.ts`:**
   - Instanciar e registrar os 5 domain handlers no `onCreate`.
   - Manter métodos públicos utilitários (`flushActiveInstanceSaves`, `isCharacterOnline`, `restorePlayerToThaisCity`, etc.) intactos para garantir retrocompatibilidade total com as APIs e testes existentes.
3. **Validação & Testes:**
   - `npm run typecheck` (0 erros).
   - Criar `tests/phase246-server-domain-handlers.test.ts` validando a delegação e o funcionamento dos handlers.
   - Executar os testes do servidor e de persistência (`phase244`, `phase225`, etc.).
