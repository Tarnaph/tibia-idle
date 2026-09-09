# CORREÇÕES

1 - Corrija a inconsistência de nível e experiência: meu personagem aparece nível 19, cai para 7 ao morrer e depois entra como 63.

Encontramos no código:

ThaisCityRoom calcula loadedExperience no login, mas não atribui a player.experience, que começa em zero.

Navegador e servidor salvam nível/XP por caminhos diferentes.

O salvamento usa o maior nível informado, permitindo nível incompatível com a XP.

A morte recalcula o nível pela experiência e expõe essa diferença.

Unifique a autoridade sobre o progresso, carregue a XP corretamente e impeça salvamentos antigos de sobrescrever estados recentes. Nível e experiência devem permanecer coerentes no login, durante a caça, após morrer e ao reconectar.

Preserve o banco e o progresso existente. Antes de corrigir valores já inconsistentes, faça backup e identifique o progresso válido; não zere nem reduza personagens arbitrariamente.

Valide a sequência completa de ganhar XP, morrer, sair e entrar novamente, inclusive com salvamentos simultâneos.

2 - Às vezes entro em Dragon Lair e nenhum dragon aparece. Verifique se eles não foram criados, nasceram fora da área acessível ou estão invisíveis.

Dois pontos encontrados:

populateRespawnZone pode sortear posições no recorte inteiro sem validar caminho até o jogador.

PixiArena reaproveita IDs ao reentrar na mesma caçada e só limpa as entidades quando muda o definitionId. Confira se monstros anteriormente ocultos continuam invisíveis.

Corrija a causa e teste entrar, matar dragons, sair e entrar novamente várias vezes. Preserve o mapa e a coordenada de entrada; os dragons devem nascer em posições válidas e acessíveis, com a visibilidade reiniciada corretamente.

3 - Ao clicar ali no quadrado do lado de conta e nome do usuario deve abrir essa tela que mandei em anexo que é a tela do personagem ali do lado do nome voce pode deixar setas caso tenha mais personagens ativos no squad para trocar de personagem e editar, neste menu do lado esquerdo ali no quadrado ao invés de mostrar o outfit pode ser um avatar, vou disponibilizar 5 avatar depois para o player escolher qual quer usar e esse avatar vai ficar aparecendo la em cima no quadrado durante o jogo
