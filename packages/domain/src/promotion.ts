import type { PromotedVocationName } from '../../content-schema/src';
import type { GameContent, GameState } from './types';

export const PROMOTION_LEVEL = 20;
export const PROMOTION_COST = 20_000;
const promotions: Record<string, PromotedVocationName> = {
  Knight: 'Elite Knight', Paladin: 'Royal Paladin', Sorcerer: 'Master Sorcerer', Druid: 'Elder Druid',
};

export interface PromotionResult { ok: boolean; state: GameState; error?: string }

export function promotedVocationFor(baseVocation: string): PromotedVocationName {
  const promoted = promotions[baseVocation];
  if (!promoted) throw new Error(`No promotion for ${baseVocation}.`);
  return promoted;
}

export function promoteCharacter(state: GameState, characterId: string, content: GameContent): PromotionResult {
  const character = state.session.characters.find((candidate) => candidate.id === characterId);
  if (!character) return { ok: false, state, error: 'Character not found.' };
  if (character.promotion) return { ok: false, state, error: 'Character is already promoted.' };
  if (character.level < PROMOTION_LEVEL) return { ok: false, state, error: `Level ${PROMOTION_LEVEL} required.` };
  if (state.session.gold < PROMOTION_COST) return { ok: false, state, error: `${PROMOTION_COST} gold required.` };
  const promotion = promotedVocationFor(character.baseVocation);
  if (!content.vocations.some((vocation) => vocation.name === promotion && vocation.fromVocationId > 0)) {
    return { ok: false, state, error: `${promotion} was not imported from vocations.xml.` };
  }
  return {
    ok: true,
    state: {
      ...state,
      session: {
        ...state.session,
        gold: state.session.gold - PROMOTION_COST,
        characters: state.session.characters.map((candidate) => candidate.id === characterId
          ? { ...candidate, vocation: promotion, promotion }
          : candidate),
      },
    },
  };
}
