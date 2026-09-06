# Phase 79 Summary: Sistema de Estamina da Conta (Account-Wide Stamina System)

## Realizações

1. **Motor de Domínio de Estamina (`packages/domain/src/stamina.ts`)**:
   - `calculateMaxStamina(highestLevelOnAccount)`: Capacidade base de 2520 minutos (42 horas) + 30 minutos adicionais por cada nível do personagem de maior nível na conta acima do nível 1.
   - `canEnterHunt(staminaMinutes)`: Trava estrita exigindo estamina > 0 para iniciar caçadas.
   - `tickStamina(currentStamina, maxStamina, mode, deltaSeconds)`: Consumo contínuo em caçada (`hunting`, 1 min/60s), regeneração no repouso passivo (`resting`, 1 min/180s), e **regeneração acelerada 3x** na Zona de Treinamento (`training`, 1 min/60s).
   - Ejeção compulsória (`evicted: true`) acionada automaticamente ao zerar a estamina em caçada.
   - Utilitários `formatStaminaTime` (HH:MM) e `getStaminaPercentage`.

2. **Servidor Autoritativo & Persistência (Colyseus + Prisma)**:
   - Sincronização via `PlayerState` no Colyseus (`staminaMinutes`, `maxStaminaMinutes`, `isTraining`).
   - Bloqueio de entrada em caçada caso a estamina esteja zerada no handler `player:setInHunt` com mensagem `stamina:empty`.
   - Ejeção automática em tempo real no `gameTick` ao zerar a estamina com mensagem `stamina:depleted` e retorno ao Templo de Thais.
   - Persistência relacional em PostgreSQL / SQLite via Prisma (`staminaMinutes` em `Character` e consulta de maior nível da conta em `PrismaPersistenceManager`).

3. **Interface do Usuário & HUD (`apps/web/components/StaminaBar.tsx` & `SkillsWindow.tsx`)**:
   - `StaminaBar.tsx`: Componente visual com barra de progresso colorida (Verde >50%, Amarelo 15-50%, Vermelho <=15% animado), badge de estado (`⚡ Caçando (-1x)`, `💪 Treinando (3x)`, `💤 Descansando`) e tooltip explicativo.
   - `SkillsWindow.tsx`: Exibição dinâmica em tempo real do tempo restante e barra de porcentagem de estamina.

4. **Suíte de Testes Automatizados (`tests/phase79-stamina-system.test.ts`)**:
   - 12 novos testes no Vitest validando cálculo de capacidade por maior nível, consumo em caçada, ejeção compulsória ao zerar, bloqueio de caçada sem estamina, regeneração passiva e acelerada em dummies.
   - 100% de aprovação na suíte de testes de estamina e 0 erros no `npm run typecheck`.

## Artefatos Criados & Alterados
- `packages/domain/src/stamina.ts` (NEW)
- `packages/domain/src/index.ts` (MODIFY)
- `packages/domain/src/types.ts` (MODIFY)
- `packages/server/src/schemas/PlayerState.ts` (MODIFY)
- `packages/server/src/persistence/PrismaPersistenceManager.ts` (MODIFY)
- `packages/server/src/rooms/ThaisCityRoom.ts` (MODIFY)
- `apps/web/components/StaminaBar.tsx` (NEW)
- `apps/web/components/SkillsWindow.tsx` (MODIFY)
- `tests/phase79-stamina-system.test.ts` (NEW)
- `.planning/phases/phase-79-stamina-system/79-PLAN.md` (NEW)
- `.planning/phases/phase-79-stamina-system/79-SUMMARY.md` (NEW)

## Verificação de Qualidade
- `npm run typecheck`: 0 erros de compilação TypeScript.
- `tests/phase79-stamina-system.test.ts`: 100% dos testes aprovados (12/12).
