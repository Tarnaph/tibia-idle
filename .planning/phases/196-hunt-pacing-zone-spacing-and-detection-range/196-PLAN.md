# Plan 196-01: Correção de Pacing de Caçadas (Espaçamento de Zonas de Respawn e Raio de Detecção de Criaturas)

## Objetivo
Corrigir o agrupamento excessivo de monstros na entrada das caçadas (em especial Cyclops Camp), garantindo que os monstros venham em packs isolados correspondentes à dificuldade do pull (ex: Cauteloso = 2 a 3 monstros por vez) e que o jogador enfrente um pull de cada vez ao longo da rota da caverna.

## Diagnóstico Técnico
1. **Agrupamento de Zonas de Respawn no Roteiro (`huntRoute.ts`):**
   - As 6 zonas de respawn estavam buscando qualquer ponto de spawn importado (`importedSpawns`) sem validar proximidade ao ponto de rota (`pathCenter`) ou distância entre zonas.
   - Em `cyclops-camp`, como todos os 6 pontos importados do OTBM estavam concentrados em um raio de 6x6 tiles perto da entrada (25, 25), todas as 6 zonas de respawn foram atribuídas ao mesmo cômodo da entrada.
2. **Raio de Detecção Excessivo (`detectionRange: 50`):**
   - Em `populateRespawnZone` (`combat.ts`), `detectionRange` estava fixado em 50 para todos os monstros.
   - Em `movement.ts`, `maxDetectionRange` utilizava `Math.max(50, enemy.detectionRange || 50)`, forçando perseguição de 50 tiles (o mapa inteiro!).
   - Ao entrar na hunt com todas as zonas povoadas, todos os 15 Cyclops detectavam o jogador no primeiro segundo e convergiam simultaneamente sobre a entrada.

## Mudanças Propostas
1. **`packages/domain/src/huntRoute.ts`**:
   - Algoritmo de distribuição espaçada de zonas ao longo da rota `path`.
   - Zonas distribuídas progressivamente ao longo de `outward` (passos 1/7, 2/7, 3/7, 4/7, 5/7, 6/7).
   - Apenas pontos importados a menos de 6 tiles de `pathCenter` e com distância mínima de 7 tiles de outras zonas já escolhidas podem ser usados; caso contrário, utiliza-se o `pathCenter`.
   - Garantir espaçamento de pelo menos 7 a 10 tiles entre os centros de cada zona de respawn.
2. **`packages/domain/src/combat.ts`**:
   - Em `populateRespawnZone`, definir `detectionRange: encounter.hunt.id === 'pvp-arena' ? 50 : 6`.
3. **`packages/domain/src/spatial/movement.ts`**:
   - Em `nearestActor`: raio de retenção do alvo atual (`leash`) limitado a `Math.max(10, (enemy.detectionRange || 6) + 3)`.
   - Em `moveEnemiesTowardParty`: raio de detecção inicial (`maxDetectionRange`) definido como `enemy.detectionRange || 6`.
4. **Testes Automatizados**:
   - `tests/phase196-hunt-pacing.test.ts` validando que ao iniciar `cyclops-camp` com pull cauteloso, apenas 2-3 monstros estão próximos da entrada e que as zonas estão espaçadas ao longo do mapa.
5. **Deploy**:
   - Compilação e deploy atualizado na VPS.
