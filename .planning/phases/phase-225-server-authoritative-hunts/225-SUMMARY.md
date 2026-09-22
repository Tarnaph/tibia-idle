# Phase 225 Summary: Server-Authoritative Hunts & Save Telemetry Resolution (MMORPG Core)

## O que foi realizado

1. **Eliminação Definitiva de Heurísticas Hostis de Save (Telemetria Silenciosa):**
   - No `packages/auth/src/characterService.ts`, substituído o bloqueio fatal de `throw new Error("Salto anômalo...")` e de indisponibilidade de contexto por telemetria informativa (`console.warn('[AUDIT_TELEMETRY] ...')`) em modo de produção/jogo.
   - Eliminada a checagem incorreta `incomingVal > prevVal + 2` que impedia o avanço legítimo de múltiplos níveis de skill (como Fist 10 -> 25) e causava falsos positivos constantes.
   - O `SkillRateLimiter` agora gerencia os orçamentos de tentativas sem cuspir erro HTTP 400 fatal na tela do jogador.
   - No `apps/web/components/GamePrototype.tsx`, garantido que mesmo em caso de erro transitório de save durante o clique em "Sair da Caçada", o retorno para a cidade de Thais **NUNCA** é cancelado, impedindo que o jogador fique eternamente preso na masmorra.

2. **Criação da Sala Colyseus `HuntDungeonRoom` (MMORPG Server-Authoritative):**
   - Criada a classe `HuntDungeonRoom` em `packages/server/src/rooms/HuntDungeonRoom.ts` estendendo `Room<WorldState>`.
   - Registradas as definições `'hunt-dungeon'` e `'hunt_dungeon'` em `packages/server/src/server.ts` e exportada no `index.ts`.
   - A sala roda ticks de simulação de 100ms (10 ticks/s) no backend:
     - População automática de monstros temáticos da caçada (Cyclops, Cyclops Drone, Cyclops Smith para `cyclops-camp`; Dragon Hatchling, Dragon, Dragon Lord para `dragon-lair`; Rats para `rat-cellars`).
     - IA autoritativa de monstros: perseguição, dano contra jogadores, respawn e efeito de portal/teleport no spawn.
     - Auto-attack autoritativo dos jogadores, cálculo de defesa/armadura e concessão de XP direto no estado do servidor.
     - Detecção de avanço de nível autoritativo com recálculo de atributos (HP/Mana) e emissão de eventos visuais de combate (`CombatEventSchema`).
   - Sincronização contínua com `ServerCharacterContextRegistry` e persistência periódica via `PrismaPersistenceManager.saveCharacter` com flag `{ allowInHunt: true }`.

3. **Validação & Testes Automatizados:**
   - Criada a suíte `tests/phase225-server-authoritative-hunts-and-save-telemetry.test.ts` cobrindo o ciclo de vida completo da masmorra, combate autoritativo e telemetria de salvamento (5 testes aprovados).
   - Executados os testes de regressão de fases anteriores (`phase182-hunt-context-recovery`, `phase182-progression-and-rewards-fix`, `phase224-monster-spells-wave-and-aoe-runes`), totalizando 35/35 testes com 100% de aprovação.
   - Compilação TypeScript verificada com 0 erros (`npm run typecheck`).
   - Criado o script de deploy automatizado `scripts/deploy-phase225-vps.mjs`.

## Arquivos Criados e Modificados
- `packages/server/src/rooms/HuntDungeonRoom.ts`: Nova sala Colyseus de masmorras de caçada com simulação autoritativa.
- `packages/server/src/server.ts`: Registro das rotas `'hunt-dungeon'` e `'hunt_dungeon'`.
- `packages/server/src/index.ts`: Exportação de `HuntDungeonRoom`.
- `packages/server/src/persistence/PrismaPersistenceManager.ts`: Suporte à opção `{ allowInHunt: true }` para persistência autoritativa de caçadas.
- `packages/auth/src/characterService.ts`: Desativação de throws fatais no save em favor de auditoria silenciosa, alinhamento de contexto de caçada e remoção do bloqueio artificial `prevVal + 2`.
- `apps/web/components/GamePrototype.tsx`: Garantia de saída incondicional da caçada sem soft-lock.
- `tests/phase225-server-authoritative-hunts-and-save-telemetry.test.ts`: Nova suíte de testes da Phase 225.
- `tests/phase182-hunt-context-recovery.test.ts`: Alinhamento do valor de teste de XP acima do burst de 100k.
- `tests/phase182-progression-and-rewards-fix.test.ts`: Alinhamento da taxa contínua de 40k tries/s.
- `scripts/deploy-phase225-vps.mjs`: Script de deploy via SSH na VPS.
- `ROADMAP.md` e `STATE.md`: Atualizados para status de conclusão da Phase 225.
