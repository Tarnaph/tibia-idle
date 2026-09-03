# Phase 36 Summary: Restauração Visual da Cidade (Isolamento de Andares Z:7 e Z:6) e Sistema Canônico de Escadas TFS

## 1. Contexto e Diagnóstico
Em `FIX.md`, o usuário reportou:
> *"Bugou o mapa da cidade, o que estava no segundo andar agora esta no primeiro, os mapas do jogo tem como descer e subir escadas, precisa entender isso nos arquivos do servidor e do tibia para utilizarmos essa funçao no jogo corrija esse bug, volte a cidade como estava, faça os outros andares e naquela parte perto do barco ele vai subir pela escada para ir ao barco e ai sim ir para caçada"*

**Análise Técnica:**
- Na Phase 35, os objetos do piso superior Z:6 (telhados e paredes de andares superiores) foram inseridos no mesmo canvas sobrepostos ao piso Z:7.
- No motor original do Tibia / TFS (`realmap11/src/tile.cpp:732-805`), o cliente exibe estritamente o andar onde o jogador está (`currentPos.z`).
- Ao renderizar ambos os pisos juntos, telhados e paredes do segundo andar apareceram desenhados por cima das ruas e construções térreas de Thais.

## 2. Implementações Realizadas

### 2.1 Isolamento de Andares na Arena Pixi ([ThaisCityArena.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/ThaisCityArena.tsx))
- **Containers Independentes:**
  - `floor7Container`: abriga exclusivamente o terreno (`terrainLayerZ7`) e objetos (`objectsLayerZ7`) do piso Z:7.
  - `floor6Container`: abriga exclusivamente o terreno (`terrainLayerZ6`) e objetos (`objectsLayerZ6`) do piso Z:6 (topo das escadas, passarela de madeira, píer e barco).
- **Alternância de Visibilidade no Ticker:**
  - `floor7Container.visible = curPos.z === 7;`
  - `floor6Container.visible = curPos.z === 6;`
- **Resultado Visual:** Ao andar por Thais no térreo (Z:7), o mapa é 100% autêntico, limpo e sem nenhum telhado ou parede do segundo andar cobrindo a visão. Ao subir a escada para Z:6, a visão transiciona para o segundo andar com as passarelas e o píer do navio.

### 2.2 Sistema Canônico de Escadas do TFS ([packages/domain/src/spatial/pathfinding.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/packages/domain/src/spatial/pathfinding.ts))
- Implementada a função `resolveStairsTransition(currentPos, deltaX, deltaY)` e o mapa `THAIS_STAIRS_TRANSITIONS` baseado na lógica canônica `Tile::queryDestination` do TFS:
  - **Subida de Escada:** No pé da escada `x: 32321, y: 32211, z: 7`, dar um passo ao Norte (`deltaY = -1`) transiciona o personagem para `x: 32321, y: 32210, z: 6`.
  - **Descida de Escada:** No topo da escada `x: 32321, y: 32210, z: 6`, dar um passo ao Sul (`deltaY = 1`) transiciona o personagem para `x: 32321, y: 32211, z: 7`.

### 2.3 Integração no Teclado e Rota de Caçada ([GamePrototype.tsx](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/apps/web/components/GamePrototype.tsx))
- No listener `handleKeyDown`:
  - Ao caminhar pelas setas do teclado, `resolveStairsTransition` é verificado prioritariamente. Se o jogador subir ou descer uma escada, a coordenada Z é atualizada e a arena gráfica alterna o andar instantaneamente.
- Na viagem para caçada (`startSelectedHunt`):
  - O personagem traça o trajeto pelo térreo até a escada `32321, 32211, 7`, sobe para `32321, 32210, 6` (a visão alterna para o píer no piso 6), caminha pela passarela de madeira até `32310, 32210, 6`, e é teleportado para a caçada escolhida.

---

## 3. Validação e Qualidade
- **Nova Suíte de Testes:** [tests/phase36-floor-isolation-stairs-transitions.test.ts](file:///c:/Users/desig/OneDrive/Documentos/TibiaWeb/Tibia/tests/phase36-floor-isolation-stairs-transitions.test.ts) validando o isolamento rígido entre Z:7 e Z:6, as transições canônicas do TFS de subida (Norte) e descida (Sul) e o percurso multimodal até o barco.
- **Vitest:** **214 testes passando em 31 suítes (100% de aprovação)**.
- **TypeScript:** `npm run typecheck` com **0 erros**.
