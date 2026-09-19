# CORREÇÕES 

[CONCLUÍDO - Fase 197] O Ranking está errado, não é melee, tem que ter rank de sword, axe e club separados, preciso que você tire do ranking todos os personagens que você criou de teste também.

[CONCLUÍDO - Fase 197] O Ranking deve conter level, magic, fist, sword, axe, club, distance e shielding, o resto você pode tirar.

[CONCLUÍDO - Fase 197] Ao clicar o botão treino tem que abrir o menu do pátio de treinamento e não o caçadas.

[CONCLUÍDO - Fase 197] O botão de ranking e arena pvp não é ali embaixo é pra ficar la em cima no canto superior junto aos outros.

[CONCLUÍDO - Fase 197] Os players continuam consumindo potion mesmo sem ela estar colocada nas hotkeys, está errado, ele só usa potion se ela estiver nas hotkeys.

[CONCLUÍDO - Fase 197] Traga de volta o botão "Set outfit" ao clicar com o botão direito em cima do seu personagem (não colocar set outfit ao clicar nos personagens dos outros players).

[CONCLUÍDO - Fase 197] Retire o botão de "Customizar aparência/Outfit e montaria" que está no canto superior direito.

[CONCLUÍDO - Fase 197] Ao segurar ctrl e usar algum dos direcionais (as setas) o personagem vira o corpo sem andar, exemplo apertou ctrl + seta pra cima, ele vai virar o corpo para cima, esse é um tipo de controle básico que tem no tibia.

[CONCLUÍDO - Fase 198] Cada hora que eu aperto em um menu o design fica todo diferente, siga o design do "pvp arena" e faça igual os outros menus para ficar tudo parecido com a mesma identidade e proporções parecidas. (Padronização Visual Completa: Caçadas, Treino, Quests, Amigos/VIP, Party, Chat e Hotkeys).

[CONCLUÍDO - Fase 199] Falha ao salvar progresso antes de sair da caçada (renovação automática do lease de sessão pós-restart e reconciliação OCC de saveVersion entre Colyseus e Next.js) e renderização dos cadáveres (corpses) de Cyclops e criaturas multi-tile perfeitamente alinhados à grade de tiles sem fatiamento de sprites.

[EM PROGRESSO - Fase 202] Falha ao salvar progresso do servidor: Eliminar timeouts de transação interativa do Prisma (de 5s para 30s), busy_timeout de SQLite, falsos positivos de rate limiter de XP (HUNT vs NON_HUNT) e reconciliação estrita de saveVersion entre Next.js e Colyseus.

[PENDENTE] PVP: Jogadores travados no loading (aparece e volta para loading); jogadores começando no último rank (Platina) ao invés do primeiro (Iniciante, 0 ELO); caveira oficial do Tibia (sprite 11x11 autêntico dos assets) posicionada corretamente ao lado do nome.

[PENDENTE] Ao desmarcar "Exibir caveira no rank pvp", salvar a preferência no banco de dados para persistir após relogar.

[PENDENTE] Ao sair da arena pvp, voltar a tag de visibilidade para que fique visível em Thais para todos.

[PENDENTE] Criar função permanente para que toda vez que entrar em Thais mudar a tag para que a pessoa fique visível para os outros jogadores.

[PENDENTE] Criar sistema de log de erros centralizado integrado a novas funções e criar botão exclusivo para usuários ADMIN chamado "Debug".

[PENDENTE] Trocar o corpo dos bichos mortos nas caçadas para o corpo de skeleton canônico (item 4246 / 4247).

[PENDENTE] Cyclops Smith não está funcionando na escolha da caçada e nem dentro do jogo.

[PENDENTE] Eliminar duplicação do personagem: personagem não deve ficar no templo de Thais e na caçada ao mesmo tempo.

[PENDENTE] Ao inspecionar jogador, verificar status online em tempo real no servidor/Colyseus em vez de exibir incorretamente "offline".

[PENDENTE] Adicionar efeitos sonoros (SFX): ataques físicos para Knight e Paladin, sons de magia para Druid e Sorcerer, e som ao morrer.

[PENDENTE] Venda rápida: memorizar os últimos itens selecionados pelo usuário (localStorage) para abrir já selecionado com agilidade.

[PENDENTE] Investigar e corrigir IA para que os bichos fechem "Box" de 8 sqm em volta do jogador sem travar nas quinas ou bloquear o caminho uns dos outros (permitindo exori eficiente).

[PENDENTE] Investigar e eliminar vazamento de memória (PixiJS memory leak e tickers sem destroy) que gera o erro "Código de erro: Out of Memory" após deixar o jogo parado aberto.
