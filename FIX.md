MUDANÇAS:

- [x] Adicionei na pasta de "songs" a musica do cyclops e dos elfs é só vincular elas as suas respectivas hunts (Vinculadas e enviadas para a VPS)

- [x] quero adicionar essas hunts abaixo, faça com que ja funcione certinho a imagem dos bichos no menu e que o mapa esteja funcionando perfeitamente (4 novas hunts com atlases OTBM, rotas e miniaturas canônicas):

- [x] Coryms:
Dificuldade 1: Corym Vanguard
Dificuldade 2: Corym Vanguard, Corym Skirmisher
Dificuldade 3: Corym Vanguard, Corym Skirmisher, Corym Charlatan
Local: x: 33054 y:32029 z:11

- [x] Giant Spider:
Dificuldade 1: Tarantula, Giant Spider
Dificuldade 2: Giant Spider
Dificuldade 3: Giant Spider
Local: x: 32781 y:32299 z:7

- [x] Hero:
Dificuldade 1: Hero
Dificuldade 2: Hero, Renegade Knight
Dificuldade 3: Hero, Renegade Knight, Vicious Squire
Local: x:33297 y:31581 z:9

- [x] Hydra:
Dificuldade 1: Hydra
Dificuldade 2: Hydra, Bog Raider
Dificuldade 3: Hydra, Bog Raider
Local: x: 33004 y:32647 z:4

Implemente no Exura | Idle Adventures o sistema de acesso a outfits, addons e montarias, junto com a primeira missão de desbloqueio: Citizen Addon 1.
Siga o fluxo GSD do projeto, organize em etapas e preserve o sistema visual estabilizado: atlases, cores, preview, montarias e animação nas quatro direções.
1. Outfits Free
Liberar os outfits base:
- Citizen
- Hunter
- Mage
- Knight
Os addons dependerão de quests. Nesta entrega, implemente somente a missão do Citizen Addon 1. Os demais addons ficam bloqueados para jogadores comuns até suas respectivas missões serem implementadas.
2. Outfits Premium
Liberar os quatro outfits Free e também:
Noble, Summoner, Warrior, Barbarian, Druid, Oriental, Pirate, Assassin, Beggar, Wizard, Shaman, Norseman, Nightmare, Jester, Brotherhood, Demon Hunter e Yalaharian.
Premium libera esses outfits base, não os addons automaticamente. Os addons seguem o mesmo sistema de quests.
Confira os IDs canônicos do catálogo e contemple as versões masculina e feminina.
3. Outfits da futura Loja
Todos os demais outfits permanecem visíveis, bloqueados para Free e Premium, com “Loja” abaixo da miniatura.
Serão vendidos futuramente por Exura Coins. Não implementar preços, cobrança ou checkout nesta entrega.
Para Free, outfits exclusivos Premium devem indicar “Premium”. Addons bloqueados devem explicar que exigem quest.
4. Montarias e cargos
- Free: somente Rented Horse e Donkey.
- Premium: todas as montarias liberadas provisoriamente.
- GOD e GM: todos os outfits, addons e montarias, inclusive os classificados como Loja, independentemente de Premium ou quests.
No futuro, algumas montarias Premium dependerão de quests. Prepare a estrutura de desbloqueios, mas não aplique essa restrição agora.
Os privilégios devem vir do cargo autenticado no servidor, nunca do nome ou prefixo visual.
5. Primeira missão — Citizen Addon 1
Criar uma missão acessível a Free e Premium na aba Quests, com o nome sugerido “Primeiros Passos de um Cidadão”.
O jogador deve reunir materiais de diferentes caçadas e entregá-los para desbloquear permanentemente o primeiro addon do Citizen naquele personagem.
Receita inicial proposta para calibração:
Material	ID no catálogo local	Quantidade inicial	Monstro	Caçada
Bunch of Troll Hair	10606	5	Troll	Troll Camp
Spider Fangs	8859	3	Spider	Spider Burrow
Bone	2230	50	Skeleton	Old Crypt
Lump of Dirt	10609	20	Rotworm	Rotworm Cave


Os drops base encontrados no catálogo local foram, respectivamente, 1%, 0,81%, 49,1% e 10%, com uma unidade por sucesso. Confirme que essas tabelas são efetivamente usadas pelo servidor atual antes de implementar.
Não adicionar monstros indisponíveis nem inventar materiais. Não alterar globalmente os drops para encaixar a missão.
Objetivo de duração: aproximadamente 60–90 minutos de coleta ativa, partindo de zero materiais, para um personagem iniciante com equipamento compatível com essas caçadas.
As quantidades acima são uma proposta, não um balanceamento já comprovado. Antes de fechar a receita:
- Meça o ritmo real de abates e obtenção dos materiais nas caçadas.
- Considere os multiplicadores ativos, variantes de monstros e funcionamento do loot em Party.
- Informe o personagem, nível, equipamento e condições usados como referência.
- Ajuste as quantidades para atingir a duração pretendida sem depender excessivamente de um drop raro.
- Apresente a receita final e a estimativa fundamentada, incluindo a variação causada pela sorte.
Não implemente um temporizador artificial de uma hora. O esforço deve vir da coleta. Um personagem forte ou alguém que já possua os materiais poderá concluir mais rápido; não prometa um mínimo absoluto que o sistema de drops não garante.
6. Funcionamento da missão
Na aba Quests, mostrar:
- Recompensa: Citizen — Addon 1.
- Ícone e nome de cada material.
- Quantidade disponível e quantidade necessária.
- Monstro e caçada onde obter.
- Estado da missão e botão “Entregar materiais e desbloquear”.
A entrega ocorre em Thais, pela interface da missão. Não criar um NPC novo nesta etapa.
Utilizar os materiais existentes no inventário/loot persistido que pertençam ao jogador. Não criar contadores fictícios desconectados dos itens reais e não contar o mesmo estoque duas vezes.
Materiais já obtidos anteriormente podem ser usados. Em Party, respeitar a propriedade e as regras reais do loot, impedindo que a mesma pilha seja utilizada em entregas de personagens diferentes.
Ao confirmar a entrega:
1. O servidor verifica os materiais e se a recompensa ainda não foi obtida.
2. Consome exatamente as quantidades exigidas.
3. Registra a conclusão e o desbloqueio permanente.
4. Atualiza o modal de outfits para permitir marcar o Addon 1.
Consumo e desbloqueio devem ocorrer numa única transação, sem perda de itens se houver falha e sem recompensa ou cobrança duplicada por cliques repetidos, retries ou duas abas.
Não cobrar gold adicional nesta primeira missão. Não equipar o addon automaticamente: desbloqueie e deixe o jogador escolhê-lo no modal.
O desbloqueio pertence ao personagem, vale para as versões masculina e feminina do Citizen e permanece após morte, relog e reinício. O Addon 2 continua bloqueado.
GOD/GM já possuem acesso visual a tudo; esse privilégio não deve registrar automaticamente todas as quests como concluídas.
7. Permissões e compatibilidade com o jogo existente
Centralizar as regras para catálogo, modal e servidor. Validar aparência em todos os caminhos de gravação, inclusive autosave, sem confiar nas permissões enviadas pelo cliente.
Uma aparência antiga agora restrita não pode impedir salvar XP, gold, inventário ou sair da caçada.
Apresente uma proposta para tratar:
- Personagens usando aparências que passarão a ser restritas.
- Expiração do Premium.
- Remoção do cargo GM.
Essas transições ainda não foram definidas. Não apague desbloqueios nem altere personagens reais em massa. Avance nas partes independentes e sinalize a decisão necessária antes de aplicar essa migração.
Não use addons anteriormente selecionados como prova de conclusão de quest.
8. Testes e entrega
Validar com personagens isolados:
- Matriz de acesso Free, Premium e GOD/GM.
- Bloqueio de requisições manipuladas.
- Missão com materiais insuficientes e suficientes.
- Consumo exato, persistência e desbloqueio após reconexão.
- Duplo clique e entrega concorrente sem duplicar consumo/recompensa.
- Autosave antigo não restaurando materiais já consumidos nem removendo o desbloqueio.
- Citizen Addon 1 funcionando a pé e montado, nas quatro direções, com cores preservadas.
- Troca de conta sem herdar privilégios da anterior.
Execute os testes exigidos pelo projeto e typecheck. Valide o fluxo real no navegador, utilizando Chrome/Edge via CDP caso o instalador do navegador automatizado esteja indisponível.
Ao concluir, informe a receita final, a medição de duração, os testes realizados, o commit e o estado da publicação. Diferencie explicitamente código no Git de build efetivamente servido na VPS.

