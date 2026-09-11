import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Phase 135: Correção Definitiva de Persistência de Outfit e Montaria, Sincronização do Personagem Ativo em Thais e Resolução de Estado', () => {
  it('GamePrototype deve utilizar estritamente colyseus_token ou tibia_auth_token e não a chave inexistente auth_token', () => {
    const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    // Chave antiga errada nunca deve ser usada
    expect(content).not.toContain("localStorage.getItem('auth_token')");
    expect(content).not.toContain('localStorage.getItem("auth_token")');

    // handleSaveOutfit deve buscar colyseus_token ou tibia_auth_token
    expect(content).toContain("const token = typeof window !== 'undefined' ? (localStorage.getItem('colyseus_token') || localStorage.getItem('tibia_auth_token')) : null;");
  });

  it('GamePrototype deve passar activeCharacterId={activeCharacter.id} para ThaisCityArena', () => {
    const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    expect(content).toContain('<ThaisCityArena');
    expect(content).toContain('activeCharacterId={activeCharacter.id}');
  });

  it('ThaisCityArena deve declarar activeCharacterId em Props e latestRef e resolver localChar com base nele', () => {
    const thaisPath = path.resolve(__dirname, '../apps/web/components/ThaisCityArena.tsx');
    const content = fs.readFileSync(thaisPath, 'utf8');

    // Props e Ref
    expect(content).toContain('activeCharacterId?: string | null;');
    expect(content).toContain('activeCharacterId,');

    // Resolução dinâmica do personagem local ativo
    expect(content).toContain('const activeCharId = latestRef.current.activeCharacterId;');
    expect(content).toContain('const localChar = (activeCharId ? curChars.find((c) => c.id === activeCharId) : null) || curChars[0];');

    // Menus e views iniciais
    expect(content).toContain('const initialLocalChar = (activeCharacterId ? characters.find((c) => c.id === activeCharacterId) : null) || characters[0];');
    expect(content).toContain('const myLeader = localChar || curChars[0];');
  });

  it('OutfitModal deve preservar a montaria equipada e utilizar effectiveCharId ao salvar', () => {
    const outfitModalPath = path.resolve(__dirname, '../apps/web/components/OutfitModal.tsx');
    const content = fs.readFileSync(outfitModalPath, 'utf8');

    expect(content).toContain("const hasMount = Boolean(char.mount && char.mount !== 'none');");
    expect(content).toContain('const isMntActive = caps.hasMountRider && hasMount && (char.mountActive !== undefined ? char.mountActive : true);');
    expect(content).toContain('const effectiveCharId = selectedCharId || activeCharacterId || characters[0]?.id;');
    expect(content).toContain('onSave(effectiveCharId, {');
  });

  it('handleToggleMount deve validar existência de montaria equipada e persistir no banco', () => {
    const gameProtoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
    const content = fs.readFileSync(gameProtoPath, 'utf8');

    expect(content).toContain("if (!target.mount || target.mount === 'none')");
    expect(content).toContain('gameNetwork.sendChangeOutfit({ mountActive: nextMountActive })');
    expect(content).toContain('fetch(`/api/characters/${target.id}/save`');
  });
});
