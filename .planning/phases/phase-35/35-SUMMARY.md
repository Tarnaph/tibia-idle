# Phase 35 Summary: Cadência de Teclado, Velocidade Urbana (+25%) e Viagem para Caçada via Cais de Thais

## 1. Contexto e Motivação
Em `FIX.md`, o usuário apontou dois requisitos essenciais:
1. **Bug de Velocidade das Setinhas:** Ao manter uma das setinhas do teclado pressionada na cidade, o personagem andava em velocidade supersônica devido aos eventos repetidos do sistema operacional no `keydown`. Era necessário travar a cadência na velocidade oficial do personagem e conceder um bônus de 25% na cidade para melhor locomoção.
2. **Viagem Imersiva para Caçadas:** Ao escolher uma caçada na cidade, em vez de um teleporte imediato, o personagem deve caminhar até o pé da escada em `x: 32321, y: 32211, z: 7`, subir a escada saindo em `x: 32321, y: 32210, z: 6`, caminhar ao longo do cais/píer de madeira até `x: 32310, y: 32210, z: 6`, e apenas ao chegar nesse ponto ser teleportado para a caçada escolhida.

## 2. Implementações Realizadas

### 2.1 Trava de Cadência do Teclado e Velocidade Urbana (+25%) ([GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx))
- **Cálculo da Velocidade Urbana:**
  - `baseStepDurationMs = calculateStepDurationMs(playerSpeed)` (fórmula TFS oficial por nível).
  - `cityStepDurationMs = Math.round(baseStepDurationMs / 1.25)` (25% mais rápido que a base).
- **Throttling de Teclado:**
  - Implementado `lastKeyStepTimeRef` no listener de teclado.
  - Se `performance.now() - lastKeyStepTimeRef.current < cityStepDurationMs`, o evento repetido de tecla é ignorado.
  - O personagem agora anda rigorosamente no ritmo oficial por passo, sem disparar descontroladamente.
- **Sincronização:**
  - O loop de caminhada autônoma (`walkingPath`) e o ticker do Pixi (`ThaisCityArena`) utilizam `cityStepDurationMs`, garantindo harmonia entre lógica e renderização.

### 2.2 Extração e Isolamento dos Pisos Z:7 e Z:6 ([extract-thais-region.mjs](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/scripts/extract-thais-region.mjs))
- Extraídos do mapa oficial `realmap.otbm`:
  - `tiles` (18.271 tiles no piso `z: 7`).
  - `upperTiles` (7.722 tiles no piso `z: 6`, contendo a parte superior das escadas, passarelas, o cais e o navio).
- Na arena gráfica ([ThaisCityArena.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx)), os pisos Z:7 e Z:6 são desenhados em camadas com `zIndex` apropriado, permitindo ver simultaneamente o chão térreo e as passarelas superiores.

### 2.3 Rota de Viagem para Caçadas via Cais ([packages/domain/src/spatial/pathfinding.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/domain/src/spatial/pathfinding.ts))
- Criada a função `findHuntTravelRoute(tileMapZ7, tileMapZ6, currentPos)`:
  - Se o jogador estiver no piso Z:7, calcula o caminho por A* até `x: 32321, y: 32211, z: 7`.
  - Adiciona o degrau da escada para `x: 32321, y: 32210, z: 6`.
  - Calcula o caminho por A* no piso Z:6 ao longo do píer de madeira até `x: 32310, y: 32210, z: 6`.
  - Ao chegar no destino final, despacha `onArrive` que reinicia a caçada (`restartHunt`) e transiciona para `setMode('hunt')`.

---

## 3. Validação e Qualidade
- **Nova Suíte de Testes:** [tests/phase35-keyboard-cadence-city-speed-dock-travel.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase35-keyboard-cadence-city-speed-dock-travel.test.ts) cobrindo bônus de 25% de velocidade, integridade dos pisos Z:7 e Z:6, rota completa da escada e do píer com validação de caminhabilidade em cada piso.
- **Vitest:** **210 testes passando em 30 suítes (100% de aprovação)**.
- **TypeScript:** `npm run typecheck` com **0 erros**.
