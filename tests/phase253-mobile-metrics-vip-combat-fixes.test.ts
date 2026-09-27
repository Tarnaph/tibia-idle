import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 253: Mobile Metrics, VIP Window & Hunt Combat Unfreeze Fixes', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. MobileHuntMetricsWidget deve ter posições e z-indices desobstruídos (top: 102px, zIndex: 56/65)', () => {
    const widgetPath = path.join(rootDir, 'apps/web/components/mobile/MobileHuntMetricsWidget.tsx');
    const content = fs.readFileSync(widgetPath, 'utf-8');

    // Pill minimizado deve ficar em top: 102px abaixo do botão de caçada e zIndex 56
    expect(content).toContain("top: '102px'");
    expect(content).toContain("zIndex: 56");

    // Card expandido deve ter zIndex 65 para foco limpo
    expect(content).toContain("zIndex: 65");
  });

  it('2. DraggableWindow não deve possuir onTouchEnd duplicado em botões de controle para evitar double-firing', () => {
    const windowPath = path.join(rootDir, 'apps/web/components/window/DraggableWindow.tsx');
    const content = fs.readFileSync(windowPath, 'utf-8');

    // Deve conter os handlers limpos de onClick
    expect(content).toContain("onClick={(e) => {");
    expect(content).toContain("toggleMinimize(id);");
    expect(content).toContain("closeWindow(id);");

    // NÃO deve conter onTouchEnd nos botões minimize-btn e close-btn
    expect(content).not.toContain("onTouchEnd={(e) => {");
  });

  it('3. WindowManagerContext deve garantir que openWindow e toggleWindow abram expandidas (isMinimized: false)', () => {
    const contextPath = path.join(rootDir, 'apps/web/components/window/WindowManagerContext.tsx');
    const content = fs.readFileSync(contextPath, 'utf-8');

    // openWindow deve explicitamente definir isMinimized: false
    expect(content).toContain("[id]: { ...prev[id], isOpen: true, isMinimized: false }");

    // toggleWindow deve resetar isMinimized: false ao abrir
    expect(content).toContain("isMinimized: willOpen ? false : prev[id].isMinimized");
  });

  it('4. globals.css deve definir posicionamento centralizado e z-index 70 para .draggable-window no mobile, e top 102px para minimizada', () => {
    const cssPath = path.join(rootDir, 'app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    expect(css).toContain(".draggable-window {");
    expect(css).toContain("top: 10vh !important;");
    expect(css).toContain("z-index: 70 !important;");
    expect(css).toContain(".draggable-window.is-minimized {");
    expect(css).toContain("top: 102px !important;");
  });

  it('5. GameClientNetworkManager deve definir isHuntContextConfirmed otimisticamente em sendSetInHunt e resetar em sendReturnToCity', () => {
    const netPath = path.join(rootDir, 'apps/web/lib/GameClientNetworkManager.ts');
    const content = fs.readFileSync(netPath, 'utf-8');

    expect(content).toContain("sendSetInHunt(inHunt: boolean, huntId?: string): void {");
    expect(content).toContain("this.isHuntContextConfirmed = Boolean(inHunt);");
    expect(content).toContain("this.isHuntContextConfirmed = false;");
  });

  it('6. GamePrototype deve executar useGameTicker e tickCombat com loop resiliente de caçada', () => {
    const protoPath = path.join(rootDir, 'apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(protoPath, 'utf-8');

    // Listener de hunt ready deve estar conectado
    expect(content).toContain("const unsubHuntReady = gameNetwork.onHuntContextReady");
    expect(content).toContain("setIsHuntContextConfirmed(Boolean(data?.isHunting))");

    // tickCombat não deve bloquear a simulação se o ack de rede estiver pendente
    expect(content).toContain("// Phase 253: Loop de combate resiliente - avança a simulação local a 120ms assim que a arena estiver pronta e visível");
    expect(content).toContain("useGameTicker(tickCombat, 120, mode === 'hunt' && encounter.status === 'running' && isArenaReady && !initialLoadingActive && !transitionLoading?.active);");
  });
});
