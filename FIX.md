# CORREÇÕES [FASE 194 - CONCLUÍDO COM SUCESSO]
As implementações solicitadas foram 100% concluídas, testadas e implantadas na VPS:
1. Novas hunts Cyclops (`32416, 32041, 8`) e Elf (`32741, 31298, 7`) integradas com extração de mapa RealMap OTBM, rotas contínuas, texturas e loading.
2. Arena PvP ao vivo entre jogadores online:
   - Fila exclusiva para jogadores reais conectados no servidor Colyseus com pareamento por rank (diferença <= 250 pontos).
   - Busca com temporizador regressivo (18s) e botão para cancelar. Se não encontrar oponente a tempo, avisa amigavelmente: "Nenhum oponente disponível no momento. Tente novamente em instantes!".
   - Teletransporte com tela cinematográfica idêntica às caçadas para os spawns oficiais da Arena:
     Spawn 1: `33136, 32965, 8`
     Spawn 2: `33136, 32973, 8`
   - Duelo automático com aproximação, execução de magias/ataques da rotação, e consumo automático de 100 Health e 100 Mana Potions.
   - Vencedor recebe +20 pontos de rank e +15 Arena Coins. Perdedor recebe +5 Arena Coins esportivas (sem dedução de pontos nem penalidade de morte).
   - Avanço de rank a cada 250 pontos com tela comemorativa e opção de ligar/desligar a caveira de patente no outfit ao atingir 250 pontos (Rank 1).
   - Retorno suave ao Templo de Thais (`32369, 32241, 7`) pós-combate.


