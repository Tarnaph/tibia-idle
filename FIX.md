CORREÇÕES:

- [x] **Unificação da Tela de Loading em Fluxo Único (0% a 100%):**
  - Eliminar o duplo loading ao selecionar o personagem (1º loading de 0% a 100% baixando o bundle JS do motor + tela piscando + 2º loading de 0% a 100% conectando mundo e assets).
  - Unificar em uma única experiência fluida e contínua sem piscar ou resetar a barra de progresso.

- [x] **Sincronização de Morte Visual e Floaters de Dano:**
  - Corrigir a dessincronização onde monstros atingidos por magias/projéteis caem mortos como esqueletos antes de o número do dano subir, causado pelo atraso visual do projétil (`delayMs`) em contraposição à morte lógica instantânea (`defeatEnemy`).
  - Sincronizar a queda/morte visual do monstro exatamente com o impacto da magia e a subida do dano.

- [x] **Substituição das Telas de Loading Oficiais (Cyclops e Elfos):**
  - Substituir os arquivos errados que foram copiados anteriormente (eram capturas de tela da janela de configuração da hotbar) pelas artes oficiais enviadas pelo usuário:
    - **Cyclops Camp:** Arte oficial do Ciclope na caverna vulcânica com fogo e lava (`media_1790021891281.jpg` -> `cyclops-camp-loading.jpg`).
    - **Elf Sanctuary:** Arte oficial dos Elfos na ponte de madeira da floresta/árvore com arco e magia (`media_1790021891257.jpg` -> `elf-sanctuary-loading.jpg`).
  - Replicar as imagens tanto em `public/images/loading/` quanto em `public/assets/loading/`.

- [x] **Transição de Loading e Execução em Aba em Segundo Plano (Background Tab Freeze):**
  - Resolver o congelamento da tela de loading quando a aba é minimizada ou colocada em segundo plano (`requestAnimationFrame` desligado pelo Chrome a 0 FPS).
  - Implementar temporizador desacoplado de renderização (via Web Worker ou timestamp com listener de `visibilitychange`), garantindo que a transição de viagem termine e o combate inicie mesmo se o jogador estiver em outra aba.

- [x] **Fim do Bypass de Poções Grátis / Mana Infinita sem Gold:**
  - Corrigir `consumePotionFromInventory` em `combat.ts`, removendo o `return true` incondicional quando a party não tem suprimentos na mochila nem dinheiro suficiente (`gold < cost`).
  - Bloquear o consumo quando faltar dinheiro/poção, forçando a gestão real de recursos.

- [x] **Analisador de Caça (AdvancedMetricsWindow) 100% Funcional e Dinâmico:**
  - Eliminar a barra de rolagem horizontal ajustando o container CSS.
  - Substituir os dados estáticos de teste por métricas em tempo real:
    - **Loot Real:** lista e soma exata de itens e gold dropados dos monstros mortos na hunt ativa.
    - **Suprimentos Reais:** contagem e custo exato de poções e runas gastas pela party.
    - **Dano Causado e Dano Recebido:** calculados com base nos eventos reais de combate.
  - Cabeçalho contextual: ao sair da hunt, exibir `Analisador de Caça (Última hunt: [Nome da Caçada])`.
  - Botão "Reset" funcional para zerar as métricas a qualquer momento.
  - Reset automático ao iniciar qualquer nova caçada.

- [x] **Resolução de Vazamento de Memória (Memory Leak) e Erro "Out of Memory" no PixiJS:**
  - Corrigir `pixiMemorySafety.ts` para compatibilidade total com PixiJS v8, destruindo adequadamente as texturas de canvas de objetos `Text` e `Graphics` dinâmicos.
  - Destruir explicitamente as texturas e texture sources de nós Text e recursivamente de contêineres e floaters, impedindo a criação desenfreada de texturas WebGL e eliminando o consumo contínuo que causava o crash da aba no Chrome.
