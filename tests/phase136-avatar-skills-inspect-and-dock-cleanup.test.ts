import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 136: Inspeção de Skills no Avatar e Limpeza da Barra de Ações Superior', () => {
  const windowDockBarPath = path.resolve(__dirname, '../apps/web/components/window/WindowDockBar.tsx');
  const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
  const windowDockBarContent = fs.readFileSync(windowDockBarPath, 'utf8');
  const gameProtoContent = fs.readFileSync(gameProtoPath, 'utf8');

  it('deve ter removido os 5 botões desnecessários da barra superior de ações', () => {
    // 1. Ícone de skills
    expect(windowDockBarContent).not.toContain('title="Skills e Atributos"');

    // 2. Ícone de equipamentos e armadura
    expect(windowDockBarContent).not.toContain('title="Equipamentos e Armadura"');

    // 3. Ícone de customizar aparência (outfit)
    expect(windowDockBarContent).not.toContain('data-dock-id="outfit-btn"');

    // 4. Ícone de montaria
    expect(windowDockBarContent).not.toContain('data-dock-id="mount-btn"');

    // 5. Ícone solto de organizar janelas na grid de ações (deve estar apenas no menu dropdown)
    expect(windowDockBarContent).not.toContain('title="Organizar Janelas / Reset Layout"');
    expect(windowDockBarContent).toContain('Restaurar posições originais de todas as janelas e barras');
  });

  it('deve reter os botões essenciais na barra de ações superior', () => {
    expect(windowDockBarContent).toContain('title="Abrir Seleção de Caçadas / Hunts"');
    expect(windowDockBarContent).toContain('title="Seu Squad / Party"');
    expect(windowDockBarContent).toContain('title="Lista de Amigos"');
    expect(windowDockBarContent).toContain('title="Métricas e Analisadores"');
    expect(windowDockBarContent).toContain('title="Chat do Jogo (World / Local / PM)"');
    expect(windowDockBarContent).toContain('title="Cyclopedia (Items, Bestiary, Bosstiary, Boss Points, Character)"');
    expect(windowDockBarContent).toContain('title="Menu de Opções & Câmera Zoom"');
    expect(windowDockBarContent).toContain('title="Sair do Jogo"');
  });

  it('deve declarar suporte a character e stats nas props de WindowDockBar', () => {
    expect(windowDockBarContent).toContain('character?: CharacterState;');
    expect(windowDockBarContent).toContain('stats?: DerivedStats;');
  });

  it('deve conter o tooltip e o popover flutuante de inspeção do personagem no avatar', () => {
    // Tooltip "Personagem"
    expect(windowDockBarContent).toContain('huntera-avatar-tooltip');
    expect(windowDockBarContent).toContain('Personagem');

    // Popover de inspeção
    expect(windowDockBarContent).toContain('huntera-inspect-popover');
    expect(windowDockBarContent).toContain('handleInspectMouseEnter');
    expect(windowDockBarContent).toContain('handleInspectMouseLeave');

    // Barras de Recursos (Vida, Mana, XP)
    expect(windowDockBarContent).toContain('currentHp.toLocaleString');
    expect(windowDockBarContent).toContain('currentMana.toLocaleString');
    expect(windowDockBarContent).toContain('xpPercent');

    // Grid com 7 Skills
    expect(windowDockBarContent).toContain('skills.fist');
    expect(windowDockBarContent).toContain('skills.club');
    expect(windowDockBarContent).toContain('skills.sword');
    expect(windowDockBarContent).toContain('skills.axe');
    expect(windowDockBarContent).toContain('skills.distance');
    expect(windowDockBarContent).toContain('skills.shielding');
    expect(windowDockBarContent).toContain('skills.magicLevel');

    // Resumo de combate
    expect(windowDockBarContent).toContain('DANO');
    expect(windowDockBarContent).toContain('ARMADURA');
    expect(windowDockBarContent).toContain('DEFESA');

    // Informações extras
    expect(windowDockBarContent).toContain('DANO BESTIÁRIO');
    expect(windowDockBarContent).toContain('COMPARTILHAR EXP');
  });

  it('deve calcular corretamente a fórmula clássica de compartilhamento de experiência (Exp Share)', () => {
    const calculateShare = (lvl: number) => ({
      min: Math.ceil((lvl * 2) / 3),
      max: Math.floor((lvl * 3) / 2),
    });

    // Level 266 (do print de referência do usuário: 178 - 399)
    const share266 = calculateShare(266);
    expect(share266.min).toBe(178);
    expect(share266.max).toBe(399);

    // Level 100
    const share100 = calculateShare(100);
    expect(share100.min).toBe(67);
    expect(share100.max).toBe(150);

    // Level 30
    const share30 = calculateShare(30);
    expect(share30.min).toBe(20);
    expect(share30.max).toBe(45);
  });

  it('GamePrototype deve passar character={activeCharacter} e stats={activeStats} para WindowDockBar', () => {
    expect(gameProtoContent).toContain('character={activeCharacter}');
    expect(gameProtoContent).toContain('stats={activeStats}');
  });
});
