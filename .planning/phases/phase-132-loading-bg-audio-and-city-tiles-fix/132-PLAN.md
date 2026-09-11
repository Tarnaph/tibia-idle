# Phase 132: Correção Definitiva do Background de Loading, BGM e Renderização de Thais

## 1. Visão Geral
- **Objetivo:** Resolver as 3 anomalias identificadas pelo usuário após a Phase 131:
  1. A imagem de fundo da tela de loading não carregou.
  2. A música (BGM) não tocou.
  3. A cidade de Thais não apareceu (personagem isolado no vácuo preto).
- **Causa Raiz Comprovada:**
  1. **Esgotamento Extremo de Sockets HTTP:** O streaming assíncrono em background disparava mais de 3.000 requisições PNG individuais (`550 immediateThaisMapUrls` + `2.210 distantThaisMapUrls` + dezenas de magias, projéteis e outfits) em blocos paralelos sem limitação. Como os navegadores limitam a 6 conexões por host, as requisições essenciais da tela de loading (`thais-loading.jpg`), áudio (`sunset-in-the-village.mp3`) e APIs de salvamento travaram em filas de 35 a 48 segundos.
  2. **Tiles Criados com `Texture.EMPTY`:** A lista prioritária síncrona não continha os ~138 sprites do templo/spawn de Thais, criando ~26.000 sprites com `Texture.EMPTY` e registrando-os em `pendingTileSprites`. Como o download dos 550 sprites imediatos engarrafou na rede, os sprites de chão permaneceram 100% invisíveis.
  3. **Autoplay Policy do Navegador sem Interação Prévia:** Ao recarregar a página (F5) ou iniciar com personagem salvo, o navegador revoga o token de interação do usuário, bloqueando `audio.play()`. O desbloqueador anterior escutava apenas `pointerdown`/`keydown` com `{ once: true }`, sem fallback no loading screen.
  4. **Invalidação do React Fast Refresh no Vite:** A exportação de constantes (`DEFAULT_HUNT_LOADING_CONFIG`, `AMBIENT_THAIS_PLAYERS`) a partir de componentes `.tsx` quebrou o Fast Refresh do Vite, gerando recarregamentos cíclicos e travamento de RSC.

---

## 2. Requisitos & Ações Técnicas

### 2.1. Desacoplamento de Constantes para Estabilidade do Vite (Fast Refresh)
- [x] Criar `apps/web/lib/loadingConfig.ts` isolando configurações de lore e backgrounds da tela de carregamento.
- [x] Criar `apps/web/lib/cityAmbientData.ts` isolando dados dos jogadores ambientais de Thais.
- [x] Atualizar imports em `ExuraLoadingScreen.tsx`, `ThaisCityArena.tsx` e `GamePrototype.tsx`.

### 2.2. Renderização Imediata e Garantida do Chão e Cenário de Thais
- [x] Identificar os ~138 URLs únicos da área visível do templo de Thais (raio de 16 tiles do spawn `32369, 32241`).
- [x] Pré-carregar essas ~138 texturas essenciais de viewport no primeiro lote prioritário (< 150ms).
- [x] Fornecer `loaded[floorUrl]` (piso de pedra do templo) como fallback visual imediato para qualquer sprite pendente, eliminando 100% qualquer vácuo ou tela preta.
- [x] Limitar o carregamento das texturas distantes (> 22 tiles) para um ritmo lento em segundo plano via `requestIdleCallback` / batches moderados de 10 URLs com intervalo, impedindo saturação do pool de conexões HTTP.

### 2.3. Resolução Garantida da Imagem de Fundo no Loading Screen
- [x] Adicionar `<link rel="preload" as="image" href="/images/loading/thais-loading.jpg">` no `<head>` de `app/layout.tsx`.
- [x] Aplicar `backgroundImage: url(...)` duplo no container de `ExuraLoadingScreen.tsx` além da tag `<img>` explícita com `loading="eager"` e `decoding="sync"`.
- [x] Substituir fundo preto sólido por gradiente escuro temático atmosférico com textura.

### 2.4. Garantia de Áudio e Desbloqueio Intuitivo de Autoplay
- [x] Expandir `setupAutoplayUnlocker` em `apps/web/lib/audioManager.ts` para escutar `['click', 'pointerdown', 'mousedown', 'keydown', 'touchstart']` em `window` e `document`.
- [x] Não descartar o listener até que o áudio realmente entre em estado de execução (`!audio.paused`).
- [x] Adicionar indicador interativo sutil na tela de loading caso a política de autoplay bloqueie a música: *"🎵 Clique em qualquer lugar para ativar a música de Thais"*, destravando o áudio imediatamente com o clique.

---

## 3. Plano de Verificação
- [x] Typecheck sem erros (`npm run typecheck`).
- [x] Testes unitários dedicados em `tests/phase132-loading-bg-audio-and-city-tiles.test.ts`.
- [x] Executar bateria completa de testes Vitest (`npm run test`).
- [x] Validar resposta HTTP rápida em `/images/loading/thais-loading.jpg` e `/songs/sunset-in-the-village.mp3`.
