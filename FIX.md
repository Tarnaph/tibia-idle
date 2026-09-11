# MUDANÇAS - CONCLUÍDAS (Phase 126)

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
