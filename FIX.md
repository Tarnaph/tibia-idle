# MUDANÇAS - CONCLUÍDAS (Phase 124)

- [x] **1 - Exhaust Canônico (Mutual Delay Poção ↔ Magia/Runa):** [CONCLUÍDO]
  - Adicionado intervalo de 1000ms entre gastar mana e usar poção.
  - Exclusão mútua por tick (`usedPotionThisTick` e `usedSpellThisTick`), impedindo cast e poção no mesmo instante.
  - Bloqueio mútuo em combate automático, acionamento manual (`triggerManualHotbarAction`) e poção de emergência.

- [x] **2 - IA de Caçada Solo Inteligente (Dynamic Cave Monster Seeking):** [CONCLUÍDO]
  - Na caçada solo, quando não houver monstros no campo de visão imediato, a IA não anda para waypoints vazios nem fica parada.
  - A rota busca dinamicamente o monstro vivo mais próximo em qualquer sala ou corredor da caverna e redireciona o caminho para engajá-lo.

- [x] **3 - Comportamento Tático Avançado em Party:** [CONCLUÍDO]
  - **Knight (Main Tank):** Vai na frente da marcha liderando a vanguarda; foca sempre no monstro mais próximo; ao detectar inimigos atacando ou focando membros da party, conjura `Challenge` (`exeta res`) forçando os monstros a focarem nele por 6000ms.
  - **Druid (Healer/Suporte):** Mantém distância tática de 3 a 4 tiles; prioriza curar o Knight com `Heal Friend` (`exura sio`) quando Knight < 85% HP e membros feridos < 80% HP antes de atacar; ataca à distância com magias e runas.
  - **Sorcerer & Paladin (Ranged DPS):** Mantêm distância tática de 3 a 4 tiles atacando com magias, runas e armas de distância, reposicionando-se caso monstros se aproximem.
  - **Target Sync:** Todos os membros secundários da party sincronizam e atacam o mesmo monstro que o Knight está atacando.