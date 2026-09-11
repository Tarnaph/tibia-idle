import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 137: Chat Fixo no Canto Inferior Esquerdo e Remoção do Ícone de Chat da Barra Superior', () => {
  const windowDockBarPath = path.resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx');
  const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const globalsCssPath = path.resolve(__dirname, '../app/globals.css');

  const windowDockBarContent = fs.readFileSync(windowDockBarPath, 'utf8');
  const gameProtoContent = fs.readFileSync(gameProtoPath, 'utf8');
  const globalsCssContent = fs.readFileSync(globalsCssPath, 'utf8');

  it('deve ter removido o botão de Chat da barra superior WindowDockBar', () => {
    expect(windowDockBarContent).not.toContain('title="Chat do Jogo (World / Local / PM)"');
    expect(windowDockBarContent).not.toContain('toggleWindow(\'chat\')');
  });

  it('GamePrototype deve declarar o estado isChatMinimized e posicionar o chat fixo no canto inferior esquerdo', () => {
    expect(gameProtoContent).toContain('const [isChatMinimized, setIsChatMinimized] = useState(false);');
    expect(gameProtoContent).toContain('data-testid="fixed-chat-dock"');
    expect(gameProtoContent).toContain('fixed-chat-dock');
    expect(gameProtoContent).toContain('fixed-chat-body');
    expect(gameProtoContent).not.toContain('<DraggableWindow id="chat"');
  });

  it('GamePrototype deve suportar expansão automática e controle de minimizar/expandir', () => {
    // Botão de minimizar/expandir
    expect(gameProtoContent).toContain('isChatMinimized ? \'▲\' : \'▼\'');
    expect(gameProtoContent).toContain('setIsChatMinimized((prev) => !prev)');

    // Expansão automática ao teclar Enter
    expect(gameProtoContent).toContain("if (e.key === 'Enter')");
    expect(gameProtoContent).toContain('setIsChatMinimized(false);');

    // Expansão automática ao receber PM ou abrir chat privado
    expect(gameProtoContent).toContain('chatWindowRef.current?.openPrivateTab');
  });

  it('globals.css deve definir as regras de posicionamento fixo para .fixed-chat-dock', () => {
    expect(globalsCssContent).toContain('.fixed-chat-dock');
    expect(globalsCssContent).toContain('position: fixed;');
    expect(globalsCssContent).toContain('left: 12px;');
    expect(globalsCssContent).toContain('bottom: 8px;');
    expect(globalsCssContent).toContain('.fixed-chat-dock.is-minimized');
    expect(globalsCssContent).toContain('.fixed-chat-body');
  });
});
