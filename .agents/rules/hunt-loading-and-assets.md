# Regra de Pré-carregamento de Caçadas e Arena PvP no Loading Screen (Hunt Loading & Assets)

## 📌 Objetivo e Princípio
Toda transição de entrada em caçadas (Hunts) ou duelos na Arena PvP DEVE utilizar o tempo de exibição da tela de loading (`ExuraLoadingScreen`) para carregar, compilar e desenhar todos os assets da hunt diretamente na GPU, garantindo que o cenário e os monstros já estejam 100% visíveis, sem atraso, sem tela preta e sem criaturas "pipocando" tardiamente após o fechamento da tela de carregamento.

---

## 🛠️ Diretrizes Obrigatórias de Implementação

1. **Pré-carregamento Prévio em Lote:**
   - Durante a inicialização da tela de loading (`startSelectedHunt` / `handleStartPvPDuel`), a aplicação DEVE acionar o carregamento dos assets da caçada ativa:
     - Atlas de texturas da caçada (`/generated/atlases/hunt-${huntId}-atlas.json` e `hunt-${huntId}-atlas.png`);
     - Sprites e frames de caminhada de todas as criaturas da hunt;
     - Efeitos visuais e mísseis de combate (`visualAssets.effects` e `visualAssets.missiles`);
     - Texturas do mapa OTBM e itens de solo.

2. **Montagem da Arena em Background sob o Loading:**
   - O estado do jogo deve transicionar para a hunt sob a proteção da tela de carregamento com `isArenaReady = false`.
   - O componente `PixiArena` monta a cena e carrega as texturas via `loadHuntAtlas` enquanto a tela de loading está cobrindo a visão do jogador com z-index elevado.
   - O `PixiArena` notifica `onSceneReady` apenas quando a câmera e as texturas essenciais estiverem prontas.

3. **Liberação Condicionada à Prontidão da GPU (`waitForAssets` & `isArenaReady`):**
   - O `ExuraLoadingScreen` NUNCA deve fazer o fade-out antes que `isArenaReady` seja verdadeiro.
   - O jogador só tem a visão revelada quando o mapa, o personagem, a party e as criaturas daquela caçada estiverem 100% desenhados e prontos para interação.
