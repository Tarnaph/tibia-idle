# CORREÇÕES

1 - Complete a importação de outfits, addons e montarias usando outfits.xml e mounts.xml do realmap11 e os sprites reais do cliente 10.98.

Hoje os outfits estão limitados a listas fixas, os addons não estão integrados à extração/prévia e as montarias usam miniaturas genéricas.

Importe todas as aparências disponíveis nesse conjunto, incluindo versões masculina/feminina, cores, addons existentes, direções e animações. Renderize o personagem corretamente sobre a montaria, sem substituir tudo por uma miniatura.

Use o mesmo catálogo na seleção, na prévia, em Thais e nas caçadas. Preserve as escolhas após relogar e mostre a aparência correta aos outros jogadores. Mantenha as regras de desbloqueio existentes e informe quais entradas do servidor não possuem sprites compatíveis, sem inventar substitutos.

2 - A caçada de Dragons continua com problema: às vezes entro na cave, nenhum dragon aparece e o personagem fica parado, sem andar.

Investigue o fluxo completo de entrada para descobrir se a simulação não iniciou, se os monstros não nasceram ou se não existe caminho válido. Confira também se a tela de carregamento terminou sem retomar o jogo e se a caçada está reaproveitando um estado antigo.

Corrija a causa e teste entrar, sair e reentrar várias vezes, inclusive após morrer ou vir de outra caçada. O personagem deve conseguir andar e os dragons devem aparecer em posições acessíveis.

Preserve o mapa e a entrada 32741,31294,11. Não contorne o problema criando uma sala artificial ou teleportando o personagem para outro lugar.

3 - As poções de mana continuam falhando: às vezes o personagem não bebe mesmo quando a condição configurada é atingida. Investigue condições do slot, ativação, recarga compartilhada com poções de vida e disponibilidade da poção. O automático deve respeitar a condição salva, sem impor outro limite fixo.

Quando uma poção for realmente consumida, sincronize:
- Recuperação de vida/mana.
- Texto “Aahhh...” acima da cabeça.
- Ícone da poção usada.
- Efeito visual no personagem correspondente à poção, conforme os scripts do realmap11 e os recursos do cliente 10.98.

Cada indicação deve aparecer uma única vez por uso, tanto no automático quanto no manual. Não confunda a animação do ícone com o efeito aplicado ao personagem.

Teste em uma caçada prolongada, após receber loot e alternando poções de vida e mana. Preserve os ícones, requisitos e valores de recuperação já corrigidos.

4 - A opção de Promotion na janela Skills deve aparecer somente quando o personagem atingir o level 20. Antes disso, mantenha-a oculta. Ao alcançar o nível necessário, ela deve aparecer automaticamente, sem precisar relogar.

Preserve os demais requisitos e regras da promoção.

5 - Retire os emojis de "Você Sabia" das tela de loading, retire o emoji de loja e retire o botão caçadas que está ao lado de depot

6 - Coloque aquela area que tem o avatar a escrita conta e o user mais para esquerda ao lado do logo deixe maior os icones de huntera coins e gold coins, no lugar daquele icone de estrela coloque um gold coin e no lugar do icone que esta ali nos huntera coins coloque o icone de tibia coins que tem nos arquivos do jogo 

7 -Ao trocar de wand, o personagem deixou de atacar com ela. Investigue e corrija o funcionamento de todas as wands e rods disponíveis no jogo.

Ao equipar uma arma válida, o ataque básico deve funcionar imediatamente, usando alcance, dano, elemento, consumo de mana, intervalo e efeitos correspondentes aos dados do realmap11 e do cliente 10.98.

Respeite os requisitos de nível e vocação e informe quando faltar mana ou algum requisito impedir o ataque. A troca deve atualizar o combate sem precisar relogar ou reiniciar a caçada.

Teste diferentes wands e rods, incluindo trocas durante a hunt. Preserve as magias e runas configuradas na barra.
