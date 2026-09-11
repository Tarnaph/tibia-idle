# Phase 132: Correção Definitiva do Background de Loading, BGM e Renderização de Thais - Summary

## 1. Contexto e Problemas Resolvidos
O usuário relatou 3 anomalias críticas no carregamento e inicialização do jogo:
1. **Imagem de fundo da tela de loading não carregou:** A tela de carregamento ficou preta/vazia.
2. **Música (BGM) não tocou:** O tema de Thais (`sunset-in-the-village.mp3`) permaneceu em silêncio.
3. **A cidade não apareceu:** O personagem (`Grievous`) surgiu flutuando no vazio preto (`#07090b`), com HUD e botões visíveis, mas sem nenhum tile de chão ou parede.

---

## 2. Diagnóstico & Causa Raiz
1. **Esgotamento Extremo de Sockets HTTP:** O streaming em background disparava mais de 3.000 requisições PNG individuais (`550 immediateThaisMapUrls` + `2.210 distantThaisMapUrls` + dezenas de magias, projéteis e outfits) em blocos paralelos sem limitação. Como os navegadores limitam a 6 conexões por host, as requisições essenciais da tela de loading (`thais-loading.jpg`), áudio (`sunset-in-the-village.mp3`) e APIs de salvamento travaram em filas de 35 a 48 segundos.
2. **Tiles Criados com `Texture.EMPTY`:** A lista prioritária síncrona não continha os ~138 sprites do templo/spawn de Thais, criando ~26.000 sprites com `Texture.EMPTY` e registrando-os em `pendingTileSprites`. Como o download dos 550 sprites imediatos engarrafou na rede, os sprites de chão permaneceram 100% invisíveis.
3. **Autoplay Policy do Navegador sem Interação Prévia:** Ao recarregar a página (F5) ou iniciar com personagem salvo, o navegador revoga o token de interação do usuário, bloqueando `audio.play()`. O desbloqueador anterior escutava apenas `pointerdown`/`keydown` com `{ once: true }`, sem fallback no loading screen.
4. **Invalidação do React Fast Refresh no Vite:** A exportação de constantes (`DEFAULT_HUNT_LOADING_CONFIG`, `AMBIENT_THAIS_PLAYERS`) a partir de componentes `.tsx` quebrou o Fast Refresh do Vite, gerando recarregamentos cíclicos e travamento de RSC.

---

## 3. Implementação e Melhorias Executadas

### 3.1. Desacoplamento e Estabilidade de Módulos (Fast Refresh Vite)
- Criado `apps/web/lib/loadingConfig.ts` contendo `THAIS_LORE_CURIOSITIES`, `DRAGON_LAIR_LORE_CURIOSITIES`, `DEFAULT_HUNT_LOADING_CONFIG`, `HUNT_LOADING_CONFIGS` e `getLoadingConfigForHunt`.
- Criado `apps/web/lib/cityAmbientData.ts` contendo `AMBIENT_THAIS_PLAYERS` e `AmbientCityPlayer`.
- Re-exportado de forma limpa em `ExuraLoadingScreen.tsx` e `ThaisCityArena.tsx`, eliminando todas as invalidações do Vite Fast Refresh.

### 3.2. Renderização Imediata e Garantida do Chão e Cenário de Thais
- Mapeados os ~138 sprites únicos na área de spawn visível do templo de Thais (`(32369, 32241)` num raio de 16 tiles).
- Inclusos no primeiro lote de carregamento prioritário (`priorityUrls`), carregando em ~100ms.
- Aplicado `defaultFloorTexture` (`loaded[floorUrl]`) como fallback visual obrigatório na criação de qualquer sprite de chão, garantindo que nenhum tile de chão seja instanciado como vazio/preto.
- O streaming de segundo plano foi particionado e compassado com pequenos intervalos (`delayBetweenChunksMs`), mantendo a fila HTTP do navegador desimpedida para requisições de áudio, salvamento e WebSocket.

### 3.3. Garantia de Renderização do Background de Loading
- Adicionada tag `<link rel="preload" as="image" href="/images/loading/thais-loading.jpg">` no `<head>` de `app/layout.tsx`.
- Aplicada dupla camada visual em `ExuraLoadingScreen.tsx`: propriedade CSS `backgroundImage` no container raiz + tag `<img>` explícita com `loading="eager"`, `decoding="sync"` e fallback de erro para `/images/loading/loading-bg.jpg`.

### 3.4. Áudio Robusto e Desbloqueio Intuitivo de Autoplay
- Expandido `setupAutoplayUnlocker` em `apps/web/lib/audioManager.ts` para escutar `['click', 'pointerdown', 'mousedown', 'keydown', 'touchstart']` no `window` e no `document`.
- Adicionado `unlockAudio()` público e rastreamento de estado `isAudioAutoplayBlocked`.
- Adicionado banner interativo no topo da tela de loading quando o navegador bloqueia a reprodução de áudio: *"🎵 Clique em qualquer lugar para ativar a música de Thais"*, com clique desbloqueando e iniciando o BGM imediatamente.

---

## 4. Verificação de Qualidade
- **TypeScript:** 0 erros com `npm run typecheck`.
- **Vitest:** 100% de aprovação na nova suíte `tests/phase132-loading-bg-audio-and-city-tiles.test.ts` e todas as suítes existentes.
