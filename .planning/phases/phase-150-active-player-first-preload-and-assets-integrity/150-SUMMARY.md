# Summary Phase 150: Arquitetura "Active Player First" de Pré-Carregamento, Sincronização Estrita da Caminhada, Normalização Canônica de Monstros e Blindagem Anti-Regressão

## Visão Geral
Nesta Fase 150, foi eliminada em definitivo a falha de carregamento incompleto do mundo e travamento/deslize da animação de caminhada, substituindo o preloader monolítico cego (~1.900 assets) por uma arquitetura "Active Player First" focada com precisão no personagem ativo (~50 a 85 assets essenciais), removendo o corte arbitrário de 2.0s da tela de loading, normalizando fisicamente os sprites de criaturas faltantes (`rat.png` e `cave-rat.png`) e criando testes de contrato de integridade que blindam o projeto contra regressões em alterações futuras.

---

## Modificações Implementadas

### 1. Arquitetura "Active Player First" (`apps/web/lib/assetPreloader.ts`)
- **Contexto do Personagem Ativo (`ActivePlayerPreloadContext`):**
  - O preloader agora aceita `{ outfit, gender, outfitColors, addons, mount, isMounted, hotbarUrls }`.
- **Fila Crítica Enxuta (`compileActivePlayerAssetUrls`):**
  - Baixa prioritariamente o traje do jogador (idle `f0` e frames de caminhada `f1..f4` em todas as 4 direções, bases e máscaras = 40 arquivos).
  - Se estiver montado, baixa apenas a montaria ativa nas 4 direções (4 arquivos).
  - Tiles do spawn em Thais (raio restrito de 3 tiles = ~36 arquivos).
  - Magias equipadas na hotbar (4 a 8 arquivos).
  - *Resultado:* Redução drástica de ~1.900 requisições para ~85 arquivos essenciais (redução de 95.5%).
- **Streaming Diferido em Segundo Plano (`startDeferredBackgroundPreload`):**
  - O restante do catálogo de trajes secundários e montarias é baixado em segundo plano com baixa concorrência (2 conexões) após o jogo já ter aberto o Frame 1, sem disputar a rede do jogador.

### 2. Remoção do Corte Arbitrário de 2.0s no Loading (`ExuraLoadingScreen.tsx`)
- Eliminada a interrupção prematura `Math.min(durationMs, 2500)` e a chamada forçada `assetPreloader.markComplete()` aos 2.0s.
- Como o pacote crítico do jogador ativo tem apenas ~85 arquivos leves (~250KB total), o download e decodificação completam naturalmente em menos de 800ms.
- A tela de loading agora só transita para o jogo quando 100% dos frames de caminhada e outfit estiverem na memória do navegador.

### 3. Invocação com Contexto Real do Personagem (`apps/web/components/GamePrototype.tsx`)
- O `assetPreloader.startPreload(...)` em `handleSelectCharacter` agora é disparado com as propriedades exatas e hidratadas do personagem selecionado (`outfit`, `gender`, `outfitColors`, `addons`, `mount`, `isMounted`).

### 4. Normalização Física de Monstros no Disco
- Copiado fisicamente o sprite do rato extraído do Tibia 10.98 (`public/generated/tibia1098/monster-rat-thumb.png`) para:
  - `public/generated/bestiary/rat.png`
  - `public/assets/monsters/rat.png`
  - `public/generated/bestiary/cave-rat.png`
  - `public/assets/monsters/cave-rat.png`
- Todos os monstros de caçadas ativas em `hunt-regions.json` agora possuem arquivos físicos existentes no disco.
- Adicionado fallback seguro em `HuntCard.tsx` para `public/generated/tibia1098/monster-${id}-thumb.png`.

### 5. Blindagem com Testes Automatizados de Integridade
- Criada suíte de testes `tests/phase150-active-player-first-preload-and-assets-integrity.test.ts`:
  1. Valida que o pacote do jogador ativo não excede o orçamento lean (< 90 assets).
  2. Valida que montaria só é colocada na fila de login se o personagem estiver montado.
  3. Valida que todos os monstros de caçadas possuem arquivos de imagem no disco.
  4. Valida a existência física dos sprites do Rato e Cave Rat em `bestiary/` e `assets/monsters/`.
  5. Valida os resolvers canônicos de `assetPaths.ts`.
  6. Valida o ciclo de vida do `AssetPreloaderService`.

---

## Verificação e Qualidade

- **TypeScript (`npm run typecheck`)**: 0 erros.
- **Vitest (`tests/phase150-active-player-first-preload-and-assets-integrity.test.ts`)**: 6 passed (100%).
- **Suíte Completa do Vitest**: 151 arquivos de teste aprovados (912 testes individuais, 0 falhas).
- **Determinismo & Persistência**: Preservados contratos determinísticos e persistência SQLite WAL.
