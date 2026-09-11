# Phase 137: Chat Fixo no Canto Inferior Esquerdo e Remoção do Ícone de Chat da Barra Superior

## Contexto & Objetivos
O usuário solicitou uma nova melhoria na organização visual da interface:
1. Retirar o ícone de Chat do topo superior direito (`WindowDockBar`).
2. Fixar a janela de Chat no canto inferior esquerdo da tela (`fixed-chat-dock`), garantindo posicionamento permanente, intuitivo e acessível para o jogador, mantendo o controle de minimizar/expandir.

## Requisitos de Implementação

### 1. Limpeza da Barra de Ações Superior (`WindowDockBar.tsx`):
- Remover o botão de Chat (`title="Chat do Jogo (World / Local / PM)"`) da grid de ações do topo.

### 2. Chat Fixo no Canto Inferior Esquerdo (`GamePrototype.tsx`):
- Substituir o uso de `<DraggableWindow id="chat">` por um container dedicado e estilizado fixo no canto inferior esquerdo (`fixed-chat-dock`).
- Posicionamento: `position: fixed; left: 12px; bottom: 8px; width: 380px; z-index: 880;`.
- Cabeçalho com título `💬 Chat` e controle de Minimizar/Expandir (`▼` / `▲`).
- Quando minimizado, reduz a altura para mostrar apenas a barra de título; quando expandido, renderiza o `ChatWindow` completo com as abas (Local, World, PMs) e input de texto.
- Ao pressionar `Enter` para falar ou clicar em "Enviar Mensagem" na lista de amigos, desminimiza o chat automaticamente (`setIsChatMinimized(false)`) e foca no campo de digitação.

### 3. Ajustes de Estilo (`app/globals.css`):
- Declarar regras para `.fixed-chat-dock` com backdrop-filter, borda temática clássica do Tibia e responsividade para não sobrepor o console inferior central.

### 4. Testes & Qualidade:
- Criar suíte `tests/phase137-fixed-bottom-left-chat-and-dock-cleanup.test.ts`.
- Atualizar asserções de `tests/phase136-avatar-skills-inspect-and-dock-cleanup.test.ts`.
- Validar typecheck (`npm run typecheck`) com 0 erros.
- Validar Vitest (`npm test`) com 100% de aprovação.
