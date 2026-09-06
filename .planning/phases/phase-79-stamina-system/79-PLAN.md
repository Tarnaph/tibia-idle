# Phase 79 Plan: Sistema de Estamina da Conta (Account-Wide Stamina System)

## Objetivo
Implementar o sistema completo de Estamina no Cavebound, com capacidade máxima calculada a partir do personagem de maior nível da conta, consumo em caçada, ejeção compulsória ao atingir 0 de estamina, regeneração passiva por tempo e regeneração acelerada na Zona de Treinamento (dummies/skills).

## Contexto & Regras de Negócio
1. **Capacidade Máxima (Max Stamina)**:
   - Calculada com base no maior nível de personagem na conta do jogador.
   - Fórmula: `MaxStamina = 2520 + (highestLevelOnAccount - 1) * 30` minutos (Base de 42 horas + 30 minutos por nível do maior personagem).
2. **Consumo em Caçada (`inHunt: true`)**:
   - Enquanto o jogador ou squad estiver em caçada, consome estamina continuamente (1 minuto por 60s reais de caçada ativa).
3. **Ejeção Obrigatória ao Zerar (`staminaMinutes <= 0`)**:
   - Ao zerar a estamina, a caçada é imediatamente finalizada (`inHunt: false`), e o jogador é teleportado de volta ao Templo/Cidade.
   - Tentativas de entrar na caçada com estamina zerada são bloqueadas com aviso em tela.
4. **Regeneração de Estamina**:
   - **Repouso Passivo (Cidade / Offline)**: Regenera 1 minuto a cada 3 minutos reais (taxa 1/3x).
   - **Zona de Treinamento (Hitting Dummies / Skills)**: Regenera 1 minuto a cada 1 minuto de treino ativo (taxa 1x / 3x mais rápida que o repouso passivo).
5. **Persistência & Sincronização Server-Side (Colyseus + Prisma)**:
   - Sincronização via `PlayerState` no Colyseus (`staminaMinutes`, `maxStaminaMinutes`).
   - Persistência no banco de dados Prisma em `Character` e `Account`.
6. **Interface de Usuário (HUD)**:
   - Barra de Estamina visual na HUD/CharacterWindow com tempo formatado (`HH:MM / HH:MM`), barra de progresso colorida (Verde > 50%, Amarela <= 50%, Vermelha <= 15%), badge de status (Caçando [-], Treinando [++], Descansando [+]), e notificação de alerta ao zerar.

## Tarefas de Implementação

### 1. Motor de Domínio (`packages/domain/src/stamina.ts` & `types.ts`)
- Criar a função `calculateMaxStamina(highestLevel: number): number`.
- Criar a função `tickStamina(currentStamina: number, maxStamina: number, state: 'hunting' | 'training' | 'resting', deltaSeconds: number): { stamina: number; evicted: boolean }`.
- Exportar helper de formatação `formatStaminaTime(minutes: number): string`.

### 2. Sincronização Server-Side & Autoritativa (`packages/server/src/schemas/PlayerState.ts` & `ThaisCityRoom.ts`)
- Adicionar campos `@type('number') staminaMinutes` e `@type('number') maxStaminaMinutes` em `PlayerState.ts`.
- No loop de tick de `ThaisCityRoom.ts`:
  - Se `player.inHunt === true`: decrementar estamina. Se `staminaMinutes <= 0`, invocar `handleExitHunt` imediatamente com notificação ao jogador.
  - Se `player.inHunt === false`: verificar se está atacando dummies de treino (`isTraining`) para aplicar a taxa acelerada, caso contrário aplicar a taxa de repouso passivo.
- Validar no endpoint/handler `enter_hunt` se `staminaMinutes > 0`. Bloquear a entrada se estiver zerado.
- Persistir `staminaMinutes` no banco Prisma durante auto-save e disconnect.

### 3. Componente de UI e HUD (`apps/web/components/StaminaBar.tsx` ou HUD)
- Criar/atualizar a Barra de Estamina visual no cliente React/Pixi.
- Exibir badge com indicador animado de consumo/recuperação.
- Exibir modal/alerta visual informando ejeção compulsória ao zerar estamina.

### 4. Suíte de Testes Automatizados (`tests/phase79-stamina-system.test.ts`)
- Testar cálculo da estamina máxima em função do maior nível da conta.
- Testar consumo de estamina em caçada e ejeção automática ao zerar.
- Testar bloqueio de entrada em caçada com 0 estamina.
- Testar regeneração passiva e regeneração acelerada no treinamento.
- Garantir 100% de aprovação nos testes e 0 erros no `npm run typecheck`.

## Critérios de Aceite (UAT)
1. Personagem com maior nível na conta aumenta a capacidade máxima de estamina.
2. Em caçada, a estamina diminui com o tempo.
3. Ao atingir 0 de estamina, a caçada encerra obrigatoriamente e o personagem é levado para a zona segura.
4. Não é possível iniciar caçada com 0 estamina.
5. Na zona de treinamento (dummies), a regeneração de estamina é visivelmente mais rápida do que o descanso passivo.
6. A estamina e capacidade máxima são exibidas corretamente na HUD e persistidas no banco.
