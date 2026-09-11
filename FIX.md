# MUDANÇAS - CONCLUÍDAS

## Phase 129 — Eliminação Definitiva de Travamento da Tela de Outfits/Montarias e Normalização Canônica Perfeita

- [x] **Diagnóstico da Causa Raiz do Travamento de Outfits/Montarias:** [CONCLUÍDO]
  - **Falso Positivo no Traje Retro Nobleman:** O fallback `idLower.includes('noble')` no `normalizeOutfitId` capturava `Retro Nobleman` (`retro-noblewoman`) e retornava erroneamente `noblewoman` (o traje clássico feminino com vestido), bloqueando a visualização e seleção do verdadeiro traje retrô. Além disso, `Norseman` não possuía alias para `norsewoman`, defaultando para `knight`.
  - **Ausência de Timeout no Carregador Assíncrono (`loadImage`):** Ao abrir o modal com 78 outfits ou 130 montarias, o carregamento simultâneo de dezenas de thumbnails ocupava a fila de conexões do navegador. Sem timeout, requisições lentas mantinham Promises eternamente pendentes em `inFlightImagePromises`, congelando a renderização no canvas de preview (`renderRecoloredOutfit`) e desativando a resposta a cliques em cores, rotações e addons.
  - **Inconsistência de Identificadores e Desconexão de Cards:** `EXTRA_OUTFITS` utilizava o nome legível em vez do slug canônico `id: o.id`, e a comparação de seleção nos cards (`isSelected`) dependia de igualdade estrita sem normalização, causando divergências de estado.
  - **Exceções em Pipeline de Canvas:** `drawRecoloredLayer` e `recolorPixels` não possuíam tratamento com `try...catch` nem validação de `naturalWidth > 0`, gerando exceções não capturadas em imagens incompletas ou contextos de canvas invalidados.

- [x] **Solução Arquitetural Definitiva Implementada:** [CONCLUÍDO]
  - **1. Normalização Canônica Estrita (`outfitRecolor.ts`):** Correspondência direta por `clean`, `name`, `femaleName` e `maleName` tem prioridade absoluta. Aliases explícitos mapeiam `Retro Nobleman` -> `retro-noblewoman`, `Noble` -> `noblewoman` e `Norseman` -> `norsewoman`. Prefixos `retro` são avaliados antes de fallbacks genéricos.
  - **2. Timeout Protetivo de 3500ms (`loadImage`):** Nenhuma Promise de imagem fica presa por mais de 3,5s. Ao expirar, a promise rejeita com segurança, limpando o timer (`clearTimeout`) e ativando os mecanismos de auto-cura e fallbacks provisórios sem travar o event loop do navegador.
  - **3. Blindagem de Contextos Canvas:** `drawRecoloredLayer` e `recolorPixels` protegidos com blocos `try...catch` e validação estrita de integridade de dimensões (`complete && naturalWidth > 0`), impedindo exceções do DOM de quebrar o React.
  - **4. Sincronização Perfeita de Cards (`OutfitModal.tsx`):** `EXTRA_OUTFITS` utiliza `id: o.id`, e tanto trajes quanto montarias utilizam `normalizeOutfitId(...)` e `normalizeMountId(...)` para o destaque de cards selecionados.
  - **5. Prevenção de Unhandled Rejections:** A chamada assíncrona a `renderRecoloredOutfit` no `useEffect` de preview agora conta com tratamento seguro `.catch()`.
  - **6. Suíte de Testes Integral:** Criada suíte `tests/phase129-audit-all-outfits-preview.test.ts` com 7 testes dedicados cobrindo todos os 78 outfits, montarias, 4 direções, variantes de gênero, addons e teste de timeout.

---

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
