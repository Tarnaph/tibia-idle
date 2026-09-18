# Phase 196: Hunt Pacing, Zone Spacing & Detection Range Isolation

## Resumo Executivo
Nesta fase, diagnosticamos e corrigimos a causa raiz pela qual as caçadas (em especial Cyclops Camp) aglomeravam dezenas de monstros na entrada ao invés de respeitar a cadência de pull por pull selecionada pelo jogador (ex: 2 a 3 monstros por vez no modo Cauteloso).

## Causa Raiz Identificada
1. **Agrupamento de Zonas de Respawn (`huntRoute.ts`):** O seletor de zonas de respawn atribuía o centro de cada zona ao ponto de spawn importado mais próximo ainda não usado. Como os 6 spawns importados do OTBM de `cyclops-camp` ficavam agrupados em uma pequena câmara de 6x6 tiles próxima à entrada (25, 25), todas as 6 zonas de respawn ficaram posicionadas na entrada, abandonando o restante dos 43 passos da caverna.
2. **Raio de Detecção Global Excessivo (`detectionRange: 50`):** Tanto em `combat.ts` quanto em `movement.ts`, o raio de detecção de monstros estava forçado a 50 tiles (`Math.max(50, enemy.detectionRange || 50)`). Como a caverna inteira cabe em 51x51 tiles, todos os 15 Cyclops detectavam o jogador no primeiro segundo e convergiam simultaneamente sobre a entrada.

## Correções Implementadas
1. **Algoritmo de Espaçamento Homogêneo de Zonas (`packages/domain/src/huntRoute.ts`):**
   - As zonas agora são distribuídas proporcionalmente ao longo de todo o trajeto `outward` da masmorra.
   - Um ponto importado só é aceito se estiver a no máximo 6 tiles do ponto da rota e a pelo menos 7 tiles de distância de todas as zonas já criadas; caso contrário, o próprio ponto do trajeto é utilizado.
   - Garante que cada um dos 6 respawns fique em uma câmara diferente da caverna.
2. **Raio de Detecção e Leash Autênticos (`packages/domain/src/combat.ts` & `movement.ts`):**
   - `detectionRange` fixado em 6 tiles para cavernas contínuas (e 50 tiles para a Arena PvP).
   - `maxDetectionRange` em `movement.ts` agora utiliza `enemy.detectionRange || 6` para detecção inicial e leash de até 10 tiles para perseguição contínua do alvo atual.
   - Criaturas em cômodos distantes permanecem em estado `roam` ou `idle` e não atacam o jogador até que ele se aproxime.

## Verificação e Testes
- **Testes Unitários:** Criada a suíte `tests/phase196-hunt-pacing.test.ts` (3 testes) com 100% de aprovação.
- **Testes de Regressão:** Suítes `continuous-hunt.test.ts` e `phase195-hunt-pull-size-and-catalog.test.ts` aprovadas (16/16 testes).
- **TypeScript:** 0 erros de tipagem com `npm run typecheck`.
