# MUDANÇAS - CONCLUÍDAS

## Phase 128 — Blindagem Arquitetural de Auto-Save, Prevenção de Esgotamento de Sockets HTTP e Resiliência Definitiva de Outfits e Movimentação

- [x] **Diagnóstico da Causa Raiz do Bug Recorrente:** [CONCLUÍDO]
  - **O que aconteceu:** O hook `useEffect` de auto-save em `GamePrototype.tsx` possuía variáveis voláteis nas dependências (`cityPos`, `activeCharacter`, etc.) e executava `void saveProgress()` na sua função de limpeza (`cleanup`).
  - **O efeito cascata:** Cada passo do personagem mudava `cityPos`, desmontando o efeito e disparando imediatamente uma requisição `POST /api/characters/[id]/save`. Andar 10 passos disparava 10 requisições simultâneas.
  - **Gargalo SQLite & Esgotamento de Sockets:** Como o SQLite bloqueia escrita concorrente, as requisições entraram em fila e demoraram até 74 segundos cada. O navegador (Google Chrome) atingiu o limite estrito de 6 conexões HTTP simultâneas para `localhost:3000`.
  - **Por que outfits/montarias sumiam:** Qualquer imagem de outfit (`/generated/outfits/...`) ou montaria (`/generated/mounts/...`) que precisasse ser carregada ficou presa na fila de sockets, sofreu timeout e foi marcada como falha definitiva no `outfitRecolor.ts`. Sem o asset, o motor caía no fallback `Texture.WHITE` (quadrado branco ou invisível).
  - **Por que a movimentação quebrava:** O React re-renderizava em loop, inundado por promessas e limpezas a cada tile andado, congelando o event loop de inputs.

- [x] **Solução Arquitetural Definitiva (Garantia de Não-Recorrência):** [CONCLUÍDO]
  - **1. Desacoplamento via Ref (`latestSaveStateRef`):** O auto-save lê o estado mais recente (`activeCharacter`, `onlineCharacter`, `cityPos`, etc.) diretamente de um `useRef` síncrono. O `useEffect` de auto-save **NUNCA** é recriado ao andar, curar ou receber itens.
  - **2. Mutex Lock de Auto-Save (`isSavingRef`):** Se já houver um save em andamento, novas chamadas concorrentes são sumariamente descartadas, eliminando filas no SQLite.
  - **3. Throttle de 10 Segundos (`lastSaveTimeRef`):** Auto-saves periódicos em segundo plano respeitam intervalo mínimo de 10s. Apenas ações intencionais (troca de personagem, logout ou fechar a aba) executam save imediato forçado (`force = true`).
  - **4. Remoção do Disparo no Cleanup:** A desmontagem de componentes **NUNCA MAIS** dispara requisições de rede.
  - **5. Resiliência no Carregamento de Sprites (`outfitRecolor.ts`):** Erros transitórios de rede ou timeout não banem mais a imagem de imediato. Apenas após 3 falhas consecutivas com intervalo de 2s uma URL é considerada inacessível, com re-tentativas automáticas em segundo plano.
  - **6. Desaceleração do Polling de Configurações:** O `/api/config` não é mais consultado a cada 3s; agora utiliza carregamento único com fallback de 60s, priorizando o WebSocket nativo do Colyseus (`server:config`).

---

## Phase 126 — Otimizações Anteriores

- [x] **1 - Carregamento Instantâneo da Seleção de Personagem:** [CONCLUÍDO]
  - Eliminado o atraso e lentidão ao clicar em "Entrar/game" ou "Jogar agora".
  - Implementado prefetching automático de rotas Next.js (`router.prefetch('/game')`) na Landing Page e no hover dos botões de ação.
  - Implementado cache local instantâneo SWR (`cavebound_cached_account` e `cavebound_cached_characters`) no `localStorage`, renderizando a lista de personagens em 0ms enquanto revalida em segundo plano sem travar a interface.
  - Inicialização síncrona do token JWT prevenindo renderização indesejada do formulário de login.
  - Otimização do loop de chroma-keying do `BardChromaVideo` (pausa nos cálculos de canvas quando o vídeo está pausado ou carregando), liberando a CPU e evitando engasgos de carregamento.

- [x] **2 - Caixa Canônica de Saída / Logout no Design Clássico do Jogo:** [CONCLUÍDO]
  - Ao clicar em sair/logout no dock superior ou pressionar a tecla `Escape` durante o jogo, uma caixa estilizada no design autêntico do Tibia/Huntera é exibida.
  - Opções disponíveis:
    - **Trocar de Personagem:** Salva o progresso do personagem atual de forma autoritativa no banco de dados, desconecta da sala e abre a tela de seleção de personagens mantendo a conta conectada.
    - **Sair do Jogo:** Salva o progresso no banco de dados, desconecta do jogo, limpa as sessões e tokens locais e redireciona para a página inicial `/`.
    - **Cancelar:** Fecha a caixa e continua jogando imediatamente.
