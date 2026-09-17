# Phase 186: Estabilização de Persistência, Navegação Admin, Promoção a GM e Título no Mapa (FIX.md)

## Bloco A — Fechar a persistência e as transições de caçada
- Validação dos 8 checkpoints:
  1. Cenário pronto antes do início do combate.
  2. Progressão além do nível 6, com XP, skills, gold e itens.
  3. Troca direta entre caçadas.
  4. Retorno ao templo com salvamento confirmado.
  5. Pelo menos dois ciclos de autosave urbano.
  6. Reconexão com comparação dos valores antes/depois.
  7. Restart durante caçada em ambiente isolado, recuperando contexto e progresso sem acumular dano/XP durante a pausa.
  8. Rejeição de gravações de uma sessão antiga e combate pausado durante carregamento/contexto pendente.
- Validação das músicas sem sobreposição na entrada, troca e saída das hunts.

## Bloco B — Navegação do painel ADMIN
- "Voltar ao jogo":
  - Retorna à sessão autorizada do jogador em `/game` preservando os cookies e autenticação.
- "Sair":
  - Executa o logout completo, removendo tokens de `localStorage`, `sessionStorage` e limpando o cookie `colyseus_token`.
  - Redireciona para `/` com recarregamento limpo, evitando loops de redirect ou estado administrativo residual.
- Passagem do `viewer` autenticado do servidor para o componente `AdminPanel`.

## Bloco C — Promover jogador a GM pelo ADMIN
- Na aba ADMIN → Jogadores, adicionar a ação "Promover a GM" (e "Remover GM").
- Janela modal de confirmação com detalhes do jogador/conta antes da execução.
- Restrição estrita no servidor (`/api/admin/players`): apenas GOD / ADMIN pode promover; tentativa de GM resulta em HTTP 403.
- Proteção de contas GOD contra rebaixamento.
- Persistência no banco: `Account.role = 'GM'` e `Character.adminTitle = 'GM'`.
- Auditoria com `systemLogger.gmAction`.
- Atualização em `ThaisCityRoom.ts` para que Colyseus reconheça contas `GM` e distribua `player.adminTitle = 'GM'`.

## Bloco D — Mostrar o próprio título GOD/GM no mapa
- Wolfy e outros personagens com `adminTitle` (GOD/GM) devem ver `[GOD]` ou `[GM]` sobre o próprio personagem no canvas.
- Prefixo `[GOD]` / `[GM]` estilizado em dourado (`#ffd700`) com o nome do personagem em verde (`#67de82`).
- Comportamento idêntico e consistente tanto na cidade (`ThaisCityArena`) quanto nas caçadas (`PixiArena`).
- Preservação dos dados: título derivado da permissão/coluna `adminTitle`, sem alterar o nome físico do personagem no banco.
