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
- [x] 1. Outfits Free:
Liberados os 4 outfits base: Citizen, Hunter, Mage e Knight. Addons dependem estritamente de quests.

- [x] 2. Outfits Premium:
Liberados os quatro outfits Free e os 17 outfits canônicos: Noble, Summoner, Warrior, Barbarian, Druid, Oriental, Pirate, Assassin, Beggar, Wizard, Shaman, Norseman, Nightmare, Jester, Brotherhood, Demon Hunter e Yalaharian (masculino e feminino). Addons dependem de quests.

- [x] 3. Outfits da futura Loja:
Todos os demais outfits exibem a badge "Loja" em lilás/lavanda (.tibia-card-badge-store), bloqueados para Free e Premium. Jogadores Free visualizam badge "Premium" nos outfits premium exclusivos.

- [x] 4. Montarias e cargos:
- Free: Somente Rented Horse, Donkey e Sem Montaria (A pé).
- Premium: Todas as montarias liberadas.
- GOD e GM: Acesso visual total e irrestrito a todos os trajes, montarias e addons via cargo autenticado (role ADMIN/GOD/GM ou adminTitle).

- [x] 5 & 6. Primeira missão — Citizen Addon 1 ("Primeiros Passos de um Cidadão"):
- Criada missão na aba Quests e integrada diretamente ao OutfitModal:
  * 5x Bunch of Troll Hair (10606) - Troll (Troll Camp)
  * 3x Spider Fangs (8859) - Spider (Spider Burrow)
  * 50x Bone (2230) - Skeleton (Old Crypt)
  * 20x Lump of Dirt (10609) - Rotworm (Rotworm Cave)
- No modal de aparência:
  * Badge "Quest" ao lado de Addon 1 e Addon 2 quando não conquistados.
  * Painel expansível exibindo lista dos 4 materiais, ícones oficiais e contagem possuída/necessária.
  * Botão dourado "Trocar" habilitado quando possuir todos os itens na mochila.
  * Transação atômica server-side ($transaction) que consome exatamente os itens do inventário, grava no Prisma DB (unlockedAddonsJson e completedQuestsJson) e libera o Addon 1 sem equipá-lo compulsoriamente.
  * Proteção estrita contra múltiplos cliques, duplicidade e concorrência (CharacterSaveLockManager).

- [x] 7. Permissões e compatibilidade com o jogo existente:
- Validação autoritativa em saveCharacterProgress no servidor.
- Saves de progressão (XP/gold/sair da caçada) não quebram mesmo se a aparência for restrita, preservando a segurança de dados.
- Jogadores não conseguem forjar envio de addons sem quest concluída (limpeza autoritativa de bits).

- [x] 8. Testes e entrega:
- Testes automatizados cobrindo matriz de permissões (phase232-outfit-mount-permissions.test.ts) e transação atômica de troca de materiais (phase233-addon-quest-trade.test.ts) com 100% de aprovação.
- npm run typecheck: 0 erros de tipagem TypeScript.


