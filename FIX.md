# CORREÇÕES

Investigar a versão online e corrigir estes quatro pontos, sem ampliar o escopo:
1. Conferir no navegador as requisições de outfits, montarias e frames de caminhada: identificar URLs com erro, timeout ou resposta incorreta; verificar se todos os arquivos utilizados foram publicados. A migração para atlas precisa abranger o carregamento real dessas camadas, preservando recoloração, gênero, addons e pose montada.
2. Corrigir o dimensionamento dos avatares. Inspecionar o CSS entregue e os estilos calculados; limitar imagem e contêiner com dimensões, object-fit e recorte adequados. Não substituir a arte para mascarar um problema de layout.
3. Remover o acesso e a renderização da janela antiga de Party, direcionando os controles para a Party unificada. Tratar também preferências antigas de janelas salvas no navegador.
4. Capturar e corrigir a causa da mensagem “Falha ao salvar progresso no servidor”, preservando os dados existentes.
Confirmar que frontend, CSS, servidor e assets pertencem à mesma versão publicada. Validar sem cache, em duas sessões, incluindo troca de outfit, montaria, caminhada, Party e salvamento seguido de novo login.
Entregar as causas comprovadas e resultados dos testes na versão online, não apenas no localhost.