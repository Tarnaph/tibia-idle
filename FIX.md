# CORREÇÕES

Antigravity, quero implementar alguns ajustes: o simbolo de [GOD] dos admins tem que aparecer para eles também, não só para os outros players, precisa configurar a progressão por stages conforme as tabelas abaixo. Preserve os dados existentes e mantenha o escopo nesses pontos.
1. Addons desalinhados durante a caminhada montada
O problema relatado acontece somente quando o personagem está em uma montaria: ao andar, os addons saem do lugar.
Investigar o fallback em apps/web/lib/outfitRecolor.ts, que substitui arquivos -mount-addon por addons da versão a pé quando o carregamento falha. Essa é uma possível causa, ainda não uma conclusão para todos os outfits.
- Conferir existência e alinhamento dos frames montados de corpo, máscaras, addon 1 e addon 2.
- Garantir que as camadas usem a mesma direção, frame de animação e origem.
- Verificar se os arquivos estão ausentes, se o caminho está incorreto ou se foram extraídos com deslocamento incompatível.
- Não aplicar um deslocamento global para esconder um problema específico de extração ou pose.
- Não sobrepor automaticamente addons a pé a um corpo montado quando as poses forem incompatíveis.
- Preservar o funcionamento dos outfits sem montaria.
- Garantir aparência consistente no personagem local e para outro jogador conectado.
Aceitação: testar addon 1, addon 2 e ambos; personagem parado e andando nas quatro direções; montar/desmontar; primeira abertura sem cache e observação em outro navegador. Registrar quais combinações foram verificadas.
2. Progressão de EXP por nível
Aplicar estas faixas, com limites inclusivos:
Nível	Multiplicador de EXP
1–8	50×
9–50	80×
51–100	60×
101–150	40×
151–200	30×
201–300	15×
301–400	12×
401–500	10×
501–600	7×
601–700	6×
701–800	5×
801–900	4×
901–1000	3×
1001–1200	2×
1201–1400	1,5×
1401+	1,2×


A intenção de progressão é:
Nível	Estágio
1–200	Early game
201–400	Transição para Mid game
401–700	Mid game
701–1000	Late game
1001–1400	End game
1401+	End game avançado


O jogador deve avançar rapidamente nos níveis baixos, chegar ao Mid game de forma acessível e levar mais tempo para alcançar o End game. Essas taxas são a configuração inicial; não alterá-las silenciosamente para balancear.
3. Stages de skills e magic level
Skill atual	Multiplicador
1–80	10×
81–100	7×
101–120	4×
121+	2×


Magic level atual	Multiplicador
0–80	10×
81–100	7×
101–120	4×
121–130	3×
131+	2×


- Aplicar os multiplicadores ao progresso de treinamento — tries ou equivalente — mantendo as fórmulas de avanço.
- Para magic level, multiplicar o progresso equivalente à mana utilizada, sem aumentar o custo real de mana das magias.
- Usar a mesma regra nos caminhos aplicáveis de combate e treinamento, evitando aplicar o multiplicador duas vezes.
- Ao atravessar uma faixa dentro de um ganho de treino, tratar o excedente com a taxa da nova faixa.
4. Bônus de stamina verde
Aplicar +50% de EXP nas três horas de stamina verde.
Exemplo: no nível 300, a taxa de 15× passa a 22,5× enquanto o bônus estiver ativo.
- Stamina e bônus devem ser individuais por personagem.
- O bônus é de EXP; não estendê-lo automaticamente a skills, magic level ou loot.
- Verificar a capacidade e a recuperação atuais da stamina. Caso não comportem três horas verdes, apresentar a incompatibilidade antes de redefinir a duração total ou as regras de recuperação.
- Exibir quando o bônus estiver ativo e a taxa efetiva de EXP.
5. Integração com Solo, Party e segurança
- Centralizar as tabelas e os cálculos em uma configuração compartilhada, com aplicação autoritativa no servidor.
- Na Party, preservar a regra existente de divisão da experiência base. Depois, aplicar a cada integrante o stage do próprio nível e seu bônus individual de stamina.
- Não usar o nível ou a stamina do líder para definir o multiplicador dos demais.
- Evitar empilhar os novos stages com multiplicadores globais antigos de forma acidental. Documentar a fórmula final e a função de cada fator mantido.
- Atualizar as validações de XP e treinamento para reconhecer ganhos legítimos com essas taxas. Não desativar as proteções nem apenas elevar limites arbitrariamente.
- Preservar a deduplicação de ganhos entre combate, WebSocket e persistência.
- Não recalcular retroativamente níveis, XP ou skills já adquiridos. As novas taxas devem afetar os ganhos futuros.
- Não modificar preços, custos de consumíveis ou taxas de loot nesta etapa.
6. Testes e entrega
- Testar todas as fronteiras das tabelas, como 8/9, 200/201, 300/301, 1400/1401 e os limites de skills e magic level.
- Confirmar o exemplo de nível 300: 15× normalmente e 22,5× com stamina verde.
- Testar uma Party com integrantes de níveis e stamina diferentes.
- Confirmar que dividir o mesmo ganho em vários eventos não duplica bônus nem permite ultrapassar indevidamente o orçamento de progresso.
- Validar que ganhos legítimos são persistidos após logout e reinício.
- Usar banco e dados sintéticos isolados; não resetar nem usar os personagens reais nos testes.
- Executar typecheck e regressões pertinentes.
- Entregar commit, arquivos alterados, fórmula final de progressão, combinações visuais testadas, resultados e limitações restantes.
- Não declarar como validado o que não tiver sido efetivamente testado.