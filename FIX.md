# CORREÇÕES

Antigravity, vamos retomar a estabilização do Exura | Idle Adventures, incluindo correções pontuais no painel administrativo.
Primeiro, confira o estado atual do projeto e da VPS: commit publicado, mudanças posteriores ao 24df69e52, músicas adicionadas às hunts e aplicação da migração 20260917185000_active_hunt_sessions. Não refaça o que já estiver implementado e validado.
Preserve as músicas novas e o sistema visual aprovado: outfits, addons, montarias, preview e animações.
Bloco A — Fechar a persistência e as transições de caçada
Objetivo: entrar, caçar, ganhar XP/skills/gold/itens, trocar de caçada, voltar ao templo e reconectar com o progresso salvo, inclusive após interrupção do servidor.
Confira as correções anteriormente relatadas:
- Contexto de caçada persistido e recuperável após restart.
- Proteção contra gravações de sessões antigas.
- Combate pausado até conexão e contexto serem confirmados.
- Recuperação automática de 503 CONTEXT_PENDING.
- Validação de contexto pelo servidor, sem confiar na flag isHunting enviada pelo cliente.
Use personagens de teste e diagnóstico correlacionado para validar:
1. Cenário pronto antes do início do combate.
2. Progressão além do nível 6, com XP, skills, gold e itens.
3. Troca direta entre caçadas.
4. Retorno ao templo com salvamento confirmado.
5. Pelo menos dois ciclos de autosave urbano.
6. Reconexão com comparação dos valores antes/depois.
7. Restart durante caçada em ambiente isolado, recuperando contexto e progresso sem acumular dano/XP durante a pausa.
8. Rejeição de gravações de uma sessão antiga.
Confira também as músicas na entrada, troca e saída das hunts, sem sobreposição indevida.
Se houver falha, registre a primeira divergência: commit, sessão, contexto, saveVersion, último salvamento confirmado, resposta completa da API e exceção. Não aumente limites nem remova proteções apenas para fazer o teste passar.
Bloco B — Navegação do painel ADMIN
Os botões de voltar ao jogo, sair e demais ações de navegação não estão funcionando corretamente.
- Reproduza e corrija cada ação.
- “Voltar ao jogo” deve retornar à sessão autorizada do jogador.
- “Sair” deve executar o logout, encerrando a sessão e removendo o acesso ao painel.
- Evite tela sem resposta, recarregamentos em loop ou estado administrativo residual ao entrar com outra conta.
Valide o acesso ao painel e ao jogo depois de voltar, sair e autenticar novamente.
Bloco C — Promover jogador a GM pelo ADMIN
Na seção ADMIN → Jogadores, adicione a ação “Promover a GM”.
- Identifique como o projeto distingue permissões da conta e título do personagem. Mantenha essa distinção explícita na implementação.
- Mostre o jogador/personagem selecionado e peça confirmação antes da promoção.
- Restrinja a ação ao GOD ou à permissão administrativa equivalente, validada no servidor. Um GM não deve conseguir promover outros jogadores por padrão.
- Persista a promoção e conceda ao jogador o acesso administrativo previsto para GM.
- Exiba [GM] em dourado antes do nome, tanto para o próprio jogador quanto para os demais.
- Atualize a sessão e a apresentação do jogador sem depender apenas de alteração visual local; confirme a persistência após reconectar.
- Registre quem promoveu, quem foi promovido e quando.
- Não transforme um GOD existente em GM nem duplique prefixos.
Valide com contas de teste: promoção autorizada, tentativa sem permissão rejeitada, atualização de acesso e título, e persistência após novo login.
Bloco D — Mostrar o próprio título GOD/GM no mapa
Hoje Wolfy vê [GOD] no cabeçalho, e outros jogadores veem o título no mapa, mas ele próprio vê apenas “Wolfy” sobre o personagem.
Corrija para que:
- O jogador também veja [GOD] Wolfy sobre o próprio personagem, com o prefixo dourado.
- A mesma regra funcione para [GM].
- O comportamento seja consistente na cidade e nas caçadas.
- O título seja derivado da função autorizada pelo servidor, sem alterar o nome permanente do personagem.
- A apresentação existente para outros jogadores continue correta.
Limite a alteração ao nome/título; não modifique composição de sprites, atlas, montarias ou animações.
Preservação e organização
- Trabalhe em commits separados por bloco, priorizando o fechamento da persistência.
- Não altere diretamente o progresso de Wolfy nem de outros personagens reais para testar.
- Não presuma que a antiga aba de Wolfy continua aberta ou que seu progresso em memória permanece recuperável.
- Não reinicie a produção como experimento.
- As pendências de poções/runas fora das hotkeys, lojas Free/Premium, Imbuements e Blessings continuam fora desta entrega.
Publicação e fechamento
Após validar os blocos, publique a versão consolidada preservando os dados, com backup consistente, migrações necessárias e rollback de código sem restaurar progresso antigo.
Confirme o commit efetivamente servido e execute uma conferência online com contas de teste.
Entregue um resumo curto:
- O que mudou em cada bloco.
- Resultados reais dos testes e pendências.
- Commit publicado.
- Se a versão está pronta para meu teste manual.
Não considere concluído apenas por build, typecheck ou HTTP 200. Precisamos do fluxo completo funcionando, das permissões corretas e do progresso preservado.