import { describe, it, expect } from 'vitest';
import {
  createIdleGame,
  restartHunt,
  castAutomaticSpells,
  triggerManualHotbarAction,
  consumePotionFromInventory,
  addPartyMember,
} from '../packages/domain/src';
import { content } from './fixture';
import fs from 'fs';
import path from 'path';

describe('Phase 217 - Cooldown/Exhaust Decoupling, Alt Level/XP Persistence, Outfit Isolation & Squad Re-login Preservation', () => {
  describe('1. Desacoplamento de Cooldown: Poções vs Magias / Runas', () => {
    it('usar poção deve aplicar cooldown APENAS em groupCooldowns["potion"], sem travar healing/attack/support', () => {
      let game = createIdleGame('test-p217-potion-decouple', content);
      const hunting = restartHunt(game, 'test-p217-potion-decouple', content, 'rat-cellars');

      const hero = hunting.session.characters[0];
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === hero.id)!;
      actor.hp = 20; // Vida baixa para disparar autocura por poção
      actor.groupCooldowns = {};
      hero.hotbar = [7618]; // Health Potion (7618)
      hunting.session.gold = 500;

      // Executa tick de auto-ações
      castAutomaticSpells(hunting, content);

      // Cooldown de poção deve ter sido aplicado
      expect(actor.groupCooldowns['potion']).toBeGreaterThan(hunting.encounter.elapsedMs);

      // Cooldowns de magias de cura, ataque e suporte DEVEM PERMANECER ZERADOS / INDEPENDENTES!
      expect(actor.groupCooldowns['healing'] ?? 0).toBe(0);
      expect(actor.groupCooldowns['attack'] ?? 0).toBe(0);
      expect(actor.groupCooldowns['support'] ?? 0).toBe(0);
    });

    it('personagem com cooldown de poção ativo CONSEGUE conjurar magia de ataque e de cura normalmente', () => {
      let game = createIdleGame('test-p217-spell-with-potion-cd', content);
      const hunting = restartHunt(game, 'test-p217-spell-with-potion-cd', content, 'rat-cellars');

      const hero = hunting.session.characters[0];
      hero.level = 20;
      hero.skills.magicLevel = 4;
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === hero.id)!;
      actor.mana = 100;
      actor.hp = 30;

      // Simula poção recém-ingerida com 1000ms de exhaust restante
      actor.groupCooldowns['potion'] = hunting.encounter.elapsedMs + 1000;
      actor.groupCooldowns['healing'] = 0;
      actor.spellCooldowns = {};

      // Hotbar com Wound Cleansing / Exura Ico (123)
      hero.hotbar = [123];

      const initialHp = actor.hp;
      castAutomaticSpells(hunting, content);

      // A magia de cura DEVE ter sido executada mesmo com poção em cooldown!
      expect(actor.hp).toBeGreaterThan(initialHp);

      // E a conjuração da magia NUNCA deve alterar ou estender o cooldown da poção!
      expect(actor.groupCooldowns['potion']).toBe(hunting.encounter.elapsedMs + 1000);
    });

    it('conjuração manual de magia não é bloqueada pelo cooldown de poção', () => {
      let game = createIdleGame('test-p217-manual-spell-potion-cd', content);
      const hunting = restartHunt(game, 'test-p217-manual-spell-potion-cd', content, 'rat-cellars');

      const hero = hunting.session.characters[0];
      hero.level = 20;
      hero.skills.magicLevel = 4;
      const actor = hunting.encounter.partyActors.find((a) => a.characterId === hero.id)!;
      actor.mana = 100;
      actor.hp = 25;

      // Simula poção em cooldown ativo
      actor.groupCooldowns['potion'] = hunting.encounter.elapsedMs + 1000;
      actor.groupCooldowns['healing'] = 0;
      actor.spellCooldowns = {};

      // Dispara Wound Cleansing (123) manualmente via hotbar
      const castResult = triggerManualHotbarAction(hunting, hero.id, 123, content);
      expect(castResult).toBe(true);
      expect(actor.hp).toBeGreaterThan(25);
    });
  });

  describe('2. Isolamento de Outfits & Montarias de Alts', () => {
    it('handleSaveOutfit e handleToggleMount isolam alts e nunca transmitem ao socket Colyseus do líder', () => {
      const protoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(protoPath, 'utf8');

      // Verifica que handleSaveOutfit valida isPrimaryPlayer
      expect(content).toContain('const isPrimaryPlayer = characterId === (latestSaveStateRef.current.activeCharacter?.id || latestSaveStateRef.current.onlineCharacter?.id);');
      expect(content).toContain('if (isPrimaryPlayer) {');
      expect(content).toContain('gameNetwork.sendChangeOutfit(customization);');

      // Verifica que no ramo de alt ele salva diretamente via endpoint com cores completas
      expect(content).toContain('fetch(`/api/characters/${characterId}/save`');
      expect(content).toContain('outfitHead: customization.outfitColors?.head ?? 0');
      expect(content).toContain('outfitBody: (customization.outfitColors as any)?.body ?? customization.outfitColors?.primary ?? 0');
      expect(content).toContain('outfitLegs: (customization.outfitColors as any)?.legs ?? customization.outfitColors?.secondary ?? 0');
      expect(content).toContain('outfitFeet: (customization.outfitColors as any)?.feet ?? customization.outfitColors?.detail ?? 0');
      expect(content).toContain('outfitAddons: customization.addons ?? 0');

      // Verifica que handleToggleMount também valida isPrimaryPlayer e salva alt diretamente
      expect(content).toContain('const isPrimaryPlayer = target.id === (latestSaveStateRef.current.activeCharacter?.id || latestSaveStateRef.current.onlineCharacter?.id);');
      expect(content).toContain('fetch(`/api/characters/${target.id}/save`');
      expect(content).toContain('mount: effectiveMount');
      expect(content).toContain('mountActive: nextMountActive');
    });

    it('saveProgress inclui cores de outfit, addons, montaria, sessionId e leaderCharacterId no salvamento de alts', () => {
      const protoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(protoPath, 'utf8');

      expect(content).toContain('outfitHead: (alt as any).outfitColors?.head ?? (alt as any).outfitHead ?? 0');
      expect(content).toContain('outfitBody: (alt as any).outfitColors?.body ?? (alt as any).outfitColors?.primary ?? (alt as any).outfitBody ?? 0');
      expect(content).toContain('outfitLegs: (alt as any).outfitColors?.legs ?? (alt as any).outfitColors?.secondary ?? (alt as any).outfitLegs ?? 0');
      expect(content).toContain('outfitFeet: (alt as any).outfitColors?.feet ?? (alt as any).outfitColors?.detail ?? (alt as any).outfitFeet ?? 0');
      expect(content).toContain('outfitAddons: (alt as any).addons ?? (alt as any).outfitAddons ?? 0');
      expect(content).toContain('mount: alt.mount || \'none\'');
      expect(content).toContain('mountActive: Boolean(alt.mountActive)');
      expect(content).toContain('sessionId: gameNetwork.LocalPlayerId || activeSessionIdRef.current || undefined');
      expect(content).toContain('leaderCharacterId: primaryChar.id');
    });
  });

  describe('3. Persistência de Squad e Preservação de Membros ao Relogar', () => {
    it('GamePrototype persiste composição do squad no localStorage e restaura alts na sessão ao logar', () => {
      const protoPath = path.resolve(__dirname, '../apps/web/components/GamePrototype.tsx');
      const content = fs.readFileSync(protoPath, 'utf8');

      // Persistência no localStorage sob a chave do líder
      expect(content).toContain('localStorage.setItem(`cavebound_squad_${leaderId}`, JSON.stringify(currentSquadIds));');

      // Restauração no login
      expect(content).toContain('const savedSquadRaw = typeof window !== \'undefined\' ? localStorage.getItem(`cavebound_squad_${userChar.id}`) : null;');
      expect(content).toContain('const restoredAlts = poolChars.filter((pc: CharacterState) => pc.id !== userChar.id && savedSquadIds.includes(pc.id));');
      expect(content).toContain('characters: [...cur.session.characters, ...toAdd].slice(0, 4)');
    });
  });

  describe('4. Backend Context & Progression Support for Alts', () => {
    it('CharacterService e API save aceitam leaderCharacterId e lastHuntId para alts da mesma conta', () => {
      const servicePath = path.resolve(__dirname, '../packages/auth/src/characterService.ts');
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      const routePath = path.resolve(__dirname, '../app/api/characters/[id]/save/route.ts');
      const routeContent = fs.readFileSync(routePath, 'utf8');

      expect(serviceContent).toContain('leaderCharacterId?: string;');
      expect(serviceContent).toContain('lastHuntId?: string;');
      expect(routeContent).toContain('leaderCharacterId: typeof body.leaderCharacterId === \'string\' ? body.leaderCharacterId : undefined');
      expect(routeContent).toContain('lastHuntId: typeof body.lastHuntId === \'string\' ? body.lastHuntId : undefined');

      // Context resolution checks leaderContext when available
      expect(serviceContent).toContain('leaderContext = await ServerCharacterContextRegistry.getContextAsync(data.leaderCharacterId);');
      expect(serviceContent).toContain('hasHuntEvidence');
    });
  });
});
