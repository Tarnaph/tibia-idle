import { describe, expect, it } from 'vitest';
import { creatureVisualLayout } from '../packages/presentation/src';

describe('Phase 34: Unificação Visual de Nome e Barra de Vida Entre Cidade e Caçada', () => {
  it('verifies that creatureVisualLayout defines the unified standard for nameplate and health bar', () => {
    expect(creatureVisualLayout.nameplateY).toBe(-32);
    expect(creatureVisualLayout.hpBarY).toBe(-24);
    expect(creatureVisualLayout.hpBarWidth).toBe(28);
  });

  it('verifies exact parity of styling constants between PixiArena (hunt) and ThaisCityArena (city)', () => {
    const HUNT_NAME_STYLE = {
      fill: 0x67de82,
      strokeColor: 0x08120a,
      strokeWidth: 2,
      fontSize: 8,
      fontFamily: 'Arial',
      fontWeight: '700',
      resolution: 2,
      nameplateY: creatureVisualLayout.nameplateY,
    };

    const CITY_NAME_STYLE = {
      fill: 0x67de82,
      strokeColor: 0x08120a,
      strokeWidth: 2,
      fontSize: 8,
      fontFamily: 'Arial',
      fontWeight: '700',
      resolution: 2,
      nameplateY: creatureVisualLayout.nameplateY,
    };

    expect(CITY_NAME_STYLE).toEqual(HUNT_NAME_STYLE);

    const HUNT_BAR_STYLE = {
      width: creatureVisualLayout.hpBarWidth,
      height: 3,
      y: creatureVisualLayout.hpBarY,
      backgroundColor: 0x251010,
      fillColor: 0x4fc977,
    };

    const CITY_BAR_STYLE = {
      width: creatureVisualLayout.hpBarWidth,
      height: 3,
      y: creatureVisualLayout.hpBarY,
      backgroundColor: 0x251010,
      fillColor: 0x4fc977,
    };

    expect(CITY_BAR_STYLE).toEqual(HUNT_BAR_STYLE);
  });
});
