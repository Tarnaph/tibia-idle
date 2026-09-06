# Phase 72 Summary: Roteamento de Mensagens Privadas (Whisper) e Entrega Multijogador

## Diagnóstico da Causa-Raiz
Ao clicar em "Mandar Mensagem" na lista de amigos, o campo de chat era preenchido com `*NomeDoAmigo* `, mas o destinatário nunca recebia a mensagem devido a 4 fatores no fluxo cliente-servidor:
1. **Ausência de Roteamento de Whisper no Servidor:** O servidor (`ThaisCityRoom.ts`) tratava todas as mensagens como públicas e aplicava filtragem estrita de proximidade/raio visual (`localRadius` e mesmo andar `posZ`). Se o amigo estivesse longe ou em outro andar, a mensagem era descartada para ele.
2. **Coerção de Canal no Cliente:** O cliente tratava todas as mensagens de entrada como puramente `'local'` ou `'world'`, sem reconhecer o canal `'whisper'`.
3. **Filtro de Abas no ChatWindow:** O `ChatWindow` filtrava estritamente por `activeTab`. Se o destinatário estivesse na aba `World Chat`, mensagens locais ficavam invisíveis.
4. **Falta de Feedback ao Remetente:** O remetente não recebia confirmação explícita de entrega privada nem aviso caso o amigo estivesse offline.

## Soluções Implementadas

1. **Roteamento Autoritativo de Whisper no Servidor (`ThaisCityRoom.ts`):**
   - Suporte a detecção de whisper clássico (`*Nome* mensagem`) e comandos (`/w`, `/whisper`, `/tell`, `/msg`).
   - Busca case-insensitive do destinatário conectado na sala.
   - Entrega ponto a ponto direta via socket ao destinatário (`recipientClient.send('chat', payload)`) e ao remetente (`client.send('chat', payload)`), **sem restrição de distância, tela ou andar**.
   - Mensagens privadas não vazam no chat local nem no log público da sala.
   - Feedback ao remetente quando o amigo está offline: `Personagem "Nome" não está online no momento.`

2. **Recepção e Auto-Abertura no Cliente (`GamePrototype.tsx`):**
   - Canal `whisper` preservado nos eventos de rede.
   - Ao receber uma nova mensagem privada de outro jogador, a janela de Chat (`ChatWindow`) é aberta e trazida para frente automaticamente (`openWindow('chat')` e `bringToFront('chat')`) com aviso em tempo real para não perder a mensagem.

3. **Visibilidade Global e Estilização no `ChatWindow.tsx`:**
   - Mensagens do canal `whisper` são exibidas tanto na aba **Local Chat** quanto na aba **World Chat** (`m.channel === activeTab || m.channel === 'whisper'`).
   - Estilização diferenciada clássica:
     - Mensagens recebidas: **Azul Ciano** luminoso (`#38bdf8`) com prefixo `De [Nome]:`.
     - Mensagens enviadas: **Magenta/Roxo** (`#c084fc`) com prefixo `Para [Nome]:`.
     - Mensagens do sistema: **Vermelho/Alerta** com prefixo `[Servidor]:`.
   - Clique rápido no nome do remetente preenche o campo de texto pronto para resposta.

4. **Testes e Qualidade:**
   - Suíte de testes criada em `tests/phase72-whisper-private-messaging.test.ts` com 100% de aprovação (5 testes).
   - Verificação de tipos TypeScript (`npm run typecheck`): 0 erros.
   - Testes de regressão (`phase71`, `phase70`, `phase57`, `phase48`): 100% aprovados.

## Verificação e Status
- **Typecheck:** 0 erros
- **Vitest:** 100% aprovado
- **Git Commits:**
  - `229384ac`: `fix(chat): add whisper routing, private messaging delivery and cross-tab visibility`
