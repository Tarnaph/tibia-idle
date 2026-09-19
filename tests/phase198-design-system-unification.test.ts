import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 198: Visual Standardization & Royal Dark Stone Design System', () => {
  const globalsCss = fs.readFileSync(path.resolve('app/globals.css'), 'utf8');
  const huntSelector = fs.readFileSync(path.resolve('apps/web/components/HuntSelector.tsx'), 'utf8');
  const friendsWindow = fs.readFileSync(path.resolve('apps/web/components/window/FriendsWindow.tsx'), 'utf8');
  const partyModal = fs.readFileSync(path.resolve('apps/web/components/party/UnifiedPartyModal.tsx'), 'utf8');
  const chatWindow = fs.readFileSync(path.resolve('apps/web/components/chat/ChatWindow.tsx'), 'utf8');
  const hotbarModal = fs.readFileSync(path.resolve('apps/web/components/HotbarConfigModal.tsx'), 'utf8');

  it('1. globals.css padroniza .draggable-window com Royal Dark Stone (#1e2022, #4a4d52, #18191b, #f3c769)', () => {
    expect(globalsCss).toContain('background: #1e2022;');
    expect(globalsCss).toContain('border: 1.5px solid #4a4d52;');
    expect(globalsCss).toContain('color: #f3c769;');
    expect(globalsCss).toContain('font-family: Georgia, serif;');
  });

  it('2. globals.css padroniza .fixed-chat-dock e .fixed-chat-body com tons escuros elegantes', () => {
    expect(globalsCss).toContain('.fixed-chat-dock {');
    expect(globalsCss).toContain('.fixed-chat-body {');
    expect(globalsCss).toContain('background: #141517;');
  });

  it('3. globals.css padroniza hotbar modal e botões de ação primária em gradiente de ouro real', () => {
    expect(globalsCss).toContain('.hotbar-config-window {');
    expect(globalsCss).toContain('background: #1e2022;');
    expect(globalsCss).toContain('.hotbar-save-btn {');
    expect(globalsCss).toContain('#eab308');
    expect(globalsCss).toContain('#facc15');
  });

  it('4. globals.css padroniza caçadas com botões de ação e tabs Royal Dark Stone', () => {
    expect(globalsCss).toContain('.hunt-start-hunt-btn {');
    expect(globalsCss).toContain('.hunt-setup-footer-btn {');
    expect(globalsCss).toContain('#27292c');
    expect(globalsCss).toContain('#facc15');
  });

  it('5. HuntSelector.tsx padroniza cards de treino e implementa aba Quests integrada', () => {
    // Treino cards
    expect(huntSelector).toContain('selectedTrainingSkill');
    expect(huntSelector).toContain('#27292c');
    expect(huntSelector).toContain('#facc15');

    // Quests inline
    expect(huntSelector).toContain('DEFAULT_QUESTS');
    expect(huntSelector).toContain('Diário de Missões & Quests');
    expect(huntSelector).toContain('selectedQuestId');
    expect(huntSelector).toContain('trackedQuestId');
    expect(huntSelector).toContain('RECOMPENSAS AO COMPLETAR');
  });

  it('6. FriendsWindow.tsx elimina tons de azul genérico e adota paleta de pedra escura e ouro', () => {
    expect(friendsWindow).toContain("backgroundColor: '#161719'");
    expect(friendsWindow).toContain("border: '1px solid #33363a'");
    expect(friendsWindow).toContain('#eab308');
    expect(friendsWindow).toContain('#facc15');
    expect(friendsWindow).not.toContain("backgroundColor: '#2563eb'");
    expect(friendsWindow).not.toContain("backgroundColor: '#1b2230'");
  });

  it('7. UnifiedPartyModal.tsx possui cabeçalho padrão Arena PvP / Highscores e botões de ouro', () => {
    expect(partyModal).toContain('Gerenciador de Party');
    expect(partyModal).toContain('#18191b');
    expect(partyModal).toContain('#f3c769');
    expect(partyModal).toContain('#eab308');
    expect(partyModal).toContain('#facc15');
    expect(partyModal).not.toContain('hunt-header-plaque-wrapper');
  });

  it('8. ChatWindow.tsx padroniza abas e botão de envio no sistema Royal Dark Stone', () => {
    expect(chatWindow).toContain("background: '#151618'");
    expect(chatWindow).toContain("background: '#18191b'");
    expect(chatWindow).toContain("background: '#121315'");
    expect(chatWindow).toContain("background: '#141517'");
    expect(chatWindow).toContain('#eab308');
    expect(chatWindow).toContain('#facc15');
  });

  it('9. HotbarConfigModal.tsx utiliza botões de remoção/limpeza harmonizados', () => {
    expect(hotbarModal).toContain('#271717');
    expect(hotbarModal).toContain('#7f1d1d');
    expect(hotbarModal).toContain('#fca5a5');
    expect(hotbarModal).not.toContain('#7a1818');
  });
});
