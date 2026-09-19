# Phase 204 Summary: Resolução Completa do PVP (Loop de Loading, Rank ELO Inicial 0, Caveira Canônica do Tibia, Persistência de Exibição e Visibilidade em Thais)

## Overview
A Fase 204 resolveu integralmente os pontos críticos de PvP, sprites e persistência destacados em `FIX.md`:
1. **Loop de Loading na Arena PvP**: Eliminado definitivamente. O `isArenaReady` agora é acionado imediatamente no `onFinish` da transição e o tempo de retorno de caçadas/arena foi otimizado para 2000ms, impedindo que `<ExuraLoadingScreen active={...}>` fosse re-ativado e reiniciado em loop contínuo.
2. **Rank Inicial 0 ELO ("Iniciante")**: Todos os novos personagens nascem com `pvpElo: 0` e `pvpTier: 'Iniciante'`. A migração autoritativa no Colyseus e no banco de dados SQLite migrou os registros legados com 1000 ELO sem partidas jogadas para 0 / 'Iniciante'.
3. **Caveiras Canônicas Oficiais do Tibia (11x11 px)**: Todas as 6 caveiras (`white`, `red`, `black`, `yellow`, `orange`, `green`) foram extraídas dos assets oficiais do Tibia na resolução nativa de 11x11 pixels (com variante 22x22 crisp nearest-neighbor). O layout do nameplate em `ThaisCityArena` e `PixiArena` agora calcula `totalW = titleW + nameW + skullW` e `startX = Math.round(-totalW / 2)`, garantindo que o conjunto [Título] + Nome + Caveira fique perfeitamente centralizado sobre a cabeça do personagem.
4. **Persistência de Preferência de Exibição da Caveira**: O campo `displaySkull` agora é persistido no Prisma DB via `Character.displaySkull` (booleano) e hidratado na inicialização e login, garantindo que desmarcar o toggle persista após relogar.
5. **Restauração Autoritativa de Visibilidade em Thais City**: Criada a função permanente `restorePlayerToThaisCity(player, spawnX, spawnY, spawnZ)` no servidor Colyseus (`ThaisCityRoom.ts`), que redefine `inHunt: false`, restaura coordenadas canônicas e sincroniza os tags no retorno à cidade ou ao término de duelos PvP. Na camada visual (`ThaisCityArena.tsx`), jogadores remotos são filtrados com precisão por `!p.inHunt && p.posZ === curPos.z`, eliminando duplicações e garantindo visibilidade imediata para todos.

---

## Verificação & Testes
- **TypeScript**: 0 erros (`npm run typecheck` passou com código 0).
- **Testes Vitest**: 32/32 testes de PvP aprovados (`phase200-pvp-matchmaking-and-skulls.test.ts`, `phase192-pvp-arena-and-skulls.test.ts`, `phase194-live-pvp-arena.test.ts`).
- **Deploy em Produção VPS (187.7.16.210)**: Realizado com sucesso com backup de banco, integridade SQLite verificada, compilação de produção (`vinext build`), migração de ELOs legados e reinicialização limpa dos serviços PM2 (`tibia-web` e `colyseus-server`).

---

## Próximos Itens de FIX.md
- Sistema de log de erros centralizado integrado e botão "Debug" exclusivo para usuários ADMIN.
- Substituição do cadáver de monstros para o esqueleto canônico (item 4246 / 4247).
- Correção do monstro Cyclops Smith na seleção de caçada e no jogo.
- Eliminação de duplicação de personagem (templo vs caçada).
- Verificação de status online em tempo real ao inspecionar jogadores.
- Efeitos sonoros (SFX): ataques físicos (Knight/Paladin), magias (Druid/Sorcerer), e som ao morrer.
