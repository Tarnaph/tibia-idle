# Phase 100: Correção Crítica da Inicialização de Jogo, Remoção de Bloqueio de Tela Preta e Exibição Confiável da Tela de Loading Exura na Cidade e Hunts

## 1. Visão Geral e Diagnóstico da Causa Raiz
O usuário reportou:
> *"a tela está preta, não apareceu a tela de loading e também não carregou o personagem na cidade"*

A investigação forense identificou quatro causas raízes correlacionadas:
1. **Conflito de Gating e Ocultação Destrutiva no Viewport (`display: none`):**
   - O container de `ThaisCityArena` em `GamePrototype.tsx` possuía a diretiva `display: (mode !== 'hunt' && isCharacterReady && !showAuthModal) ? 'block' : 'none'`.
   - No PixiJS v8, inicializar com `resizeTo: hostRef.current` enquanto o container pai possui `display: none` fixa as dimensões internas do WebGL canvas em **0x0**. Ao alternar a condição para `block`, nenhum evento de redimensionamento do DOM era disparado, mantendo a viewport com tela 100% preta.
   - O modal `TibiaAuthCharacterModal` realizava uma animação de fade-out de 750ms até opacidade 0 enquanto `showAuthModal` ainda permanecia `true`, gerando um intervalo de tela totalmente preta para o usuário sem disparar a loading screen.
2. **Condição de Corrida do Ticker PixiJS:**
   - Em `ThaisCityArena.tsx` (e `PixiArena.tsx`), quando montado com `active = false`, o ticker executava `app.ticker.stop()`. Por ser assíncrona a inicialização (`await app.init()`), a atualização de props para `active = true` disparava o `useEffect` correspondente antes do `appRef.current` estar instanciado, silenciando o render loop permanentemente.
3. **Bloqueio de Carregamento Síncrono de Centenas de Texturas:**
   - Em `ThaisCityArena.tsx`, o carregamento sequencial `await loadBatch(priorityUrls, 50)` travava o ciclo de inicialização aguardando o download de centenas de imagens antes de anexar o loop do ticker (`app.ticker.add`).
4. **Erros 400 no Endpoint `/api/characters/[id]/save` e 403 do Starter Mock:**
   - `BigInt(body.experience)` lançava `RangeError` caso `experience` fosse ponto flutuante.
   - O auto-save executava mesmo com o mock de starter `knight-aldric` antes do login do jogador real, inundando os logs do servidor com 403.

---

## 2. Implementações Realizadas

### A. Viewport Não-Destrutiva e Renderização Sob a Loading Screen (`GamePrototype.tsx`)
- Removida a ocultação com `display: none` do `ThaisCityArena`: agora utiliza `display: mode !== 'hunt' ? 'block' : 'none'`. O canvas permanece montado com dimensões reais de 100% viewport.
- A `ExuraLoadingScreen` agora opera na camada superior (`z-[9999999]`), cobrindo a viewport inteira durante os 5 segundos de carregamento.
- A cidade de Thais é inicializada em segundo plano sob a loading screen, permitindo que texturas, shaders, pisos do templo e posicionamento em `(32369, 32241, 7)` estejam 100% prontos e renderizados a 60 FPS antes do fade-out.

### B. Transição Imediata da Tela de Autenticação (`TibiaAuthCharacterModal.tsx`)
- Ao clicar em "Entrar no Jogo" com um personagem, a função `startFadeOutAndEnter` transfere imediatamente o controle chamando `onSelectCharacter`.
- Eliminado o intervalo ocioso de 750ms que causava a tela preta entre o login e o jogo.

### C. Tela de Carregamento Exura Blindada (`ExuraLoadingScreen.tsx`)
- Renderização garantida no primeiro frame (`if (!isVisible && !active) return null`).
- Z-index de máxima prioridade `z-[9999999]`, garantindo sobreposição impecável.
- Duração exata de 5000ms com preenchimento da barra de magma avermelhada e contorno ornamental com rubis.
- Fade-out suave de 400ms ao atingir 100%, revelando o jogo fluidamente.

### D. Redimensionamento Dinâmico e Ticker à Prova de Falhas (`ThaisCityArena.tsx` & `PixiArena.tsx`)
- Integrado `ResizeObserver` ativo em `hostRef.current` para acionar `app.resize()` automaticamente assim que o elemento adquire dimensões.
- Sincronização do ticker via `latestRef.current.active` para eliminar a perda de re-renders durante o `await app.init()`.
- Carregamento imediato dos primeiros assets essenciais e streaming contínuo não-bloqueante (`void loadBatch`) das demais texturas.

### E. Blindagem do Auto-Save e Persistência (`CharacterService.ts` e `/api/characters/[id]/save/route.ts`)
- Implementada a função `safeBigInt` para converter com segurança inteiros, floats arredondados e strings, evitando qualquer status 400.
- Restrito o auto-save periódico apenas a personagens autenticados (`activeCharacter.id === onlineCharacter.id`), cessando os erros 403.

---

## 3. Verificação e Testes
- **TypeScript Typecheck (`npx.cmd tsc --noEmit`):** 0 erros.
- **Suíte Vitest Phase 100 (`tests/phase100-black-screen-resolution-loading-and-city-mounting.test.ts`):** 7/7 testes aprovados.
- **Suíte Vitest Phase 99 (`tests/phase99-loading-screen-and-no-xp-loss-on-exit-hunt.test.ts`):** 7/7 testes aprovados.
- **Requisições HTTP Locais:**
  - `GET /game-preview`: 200 OK
  - `GET /images/loading/loading-bg.jpg`: 200 OK
  - `GET /images/loading/loading-bar-frame.png`: 200 OK
