import type { WebItemSellOffer } from '../../content-schema/src/index.ts';

const historicalContext = 'Item page identifies version 8.54 and reports the current NPC sell value. The item existed in 8.60; price continuity is documented as a web fallback, not treated as STYLLER data.';

/** Curated only after an internal STYLLER sell offer is proven absent. */
export const webPriceFallbacks = new Map<number, WebItemSellOffer>([
  [8859, {
    price: 10, sourceType: 'web', sourceKind: 'web-reference',
    sourceUrl: 'https://tibia.fandom.com/wiki/Spider_Fangs', sourceName: 'TibiaWiki — Spider Fangs',
    retrievedAt: '2026-09-02', tibiaVersionContext: historicalContext,
  }],
  [10606, {
    price: 30, sourceType: 'web', sourceKind: 'web-reference',
    sourceUrl: 'https://tibia.fandom.com/wiki/Bunch_of_Troll_Hair', sourceName: 'TibiaWiki — Bunch of Troll Hair',
    retrievedAt: '2026-09-02', tibiaVersionContext: historicalContext,
  }],
  [10609, {
    price: 10, sourceType: 'web', sourceKind: 'web-reference',
    sourceUrl: 'https://tibia.fandom.com/wiki/Lump_of_Dirt', sourceName: 'TibiaWiki — Lump of Dirt',
    retrievedAt: '2026-09-02', tibiaVersionContext: historicalContext,
  }],
]);
