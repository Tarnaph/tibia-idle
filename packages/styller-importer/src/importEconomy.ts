import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import type { ItemEconomyCatalog, ItemSellOffer, MonsterCatalog, StyllerItemSellOffer } from '../../content-schema/src/index.ts';
import { importMonsters } from './importMonsters.ts';
import { webPriceFallbacks } from './webPriceFallbacks.ts';

interface ImportOptions { projectRoot?: string; write?: boolean; monsters?: MonsterCatalog }
const asArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};

export async function importEconomy(options: ImportOptions = {}): Promise<ItemEconomyCatalog> {
  const projectRoot = options.projectRoot ?? process.cwd();
  const styllerRoot = resolve(projectRoot, '..', 'styller-master');
  const npcRoot = resolve(styllerRoot, 'data', 'npc');
  const offers = new Map<number, StyllerItemSellOffer[]>();
  const push = (itemId: number, offer: StyllerItemSellOffer) => offers.set(itemId, [...(offers.get(itemId) ?? []), offer]);
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false, trimValues: true });
  for (const file of (await readdir(npcRoot)).filter((name) => name.endsWith('.xml')).sort()) {
    const source = await readFile(resolve(npcRoot, file), 'utf8');
    let npc: Record<string, unknown>;
    try { npc = asRecord(asRecord(parser.parse(source)).npc); } catch { continue; }
    const parameters = asRecord(npc.parameters).parameter as Record<string, unknown> | Record<string, unknown>[] | undefined;
    for (const parameter of asArray<Record<string, unknown>>(parameters).filter((entry) => entry.key === 'shop_sellable')) {
      for (const entry of String(parameter.value ?? '').split(';')) {
        const parts = entry.trim().split(',').map((part) => part.trim());
        if (!/^\d+$/.test(parts[1] ?? '') || !/^\d+$/.test(parts[2] ?? '')) continue;
        push(Number(parts[1]), { price: Number(parts[2]), sourceNpc: String(npc.name ?? file.replace('.xml', '')), sourceFile: `data/npc/${file}`, sourceKind: 'npc-xml-shop-sellable' });
      }
    }
  }
  const taskSource = await readFile(resolve(npcRoot, 'scripts', 'task.lua'), 'utf8');
  for (const match of taskSource.matchAll(/\{id\s*=\s*(\d+),\s*buy\s*=\s*\d+,\s*sell\s*=\s*(\d+),/g)) {
    if (Number(match[2]) <= 0) continue;
    push(Number(match[1]), { price: Number(match[2]), sourceNpc: 'Grizzly Adams', sourceFile: 'data/npc/scripts/task.lua', sourceKind: 'npc-lua-sell-table' });
  }
  const monsters = options.monsters ?? await importMonsters({ projectRoot, write: false });
  const ids = [...new Set(monsters.monsters.flatMap((monster) => monster.loot.flatMap((loot) => loot.itemId === undefined ? [] : [loot.itemId])))].sort((a, b) => a - b);
  const items = ids.map((itemId) => {
    const internalOffers = (offers.get(itemId) ?? []).sort((a, b) => a.price - b.price || a.sourceNpc.localeCompare(b.sourceNpc));
    const fallback = internalOffers.length === 0 ? webPriceFallbacks.get(itemId) : undefined;
    const itemOffers: ItemSellOffer[] = fallback ? [fallback] : internalOffers;
    const prices = [...new Set(itemOffers.map((offer) => offer.price))];
    return {
      itemId,
      canonicalSellPrice: prices.length ? Math.max(...prices) : null,
      status: prices.length ? 'sellable' as const : 'priceUnknown' as const,
      offers: itemOffers,
      warnings: fallback ? [`Web fallback: ${fallback.tibiaVersionContext}`] : prices.length > 1
        ? [`Multiple proven sell prices (${prices.join(', ')}); canonical rule selects the highest.`]
        : prices.length === 0 ? ['No NPC sell offer was found; no value was invented.'] : [],
    };
  });
  const catalog: ItemEconomyCatalog = { importedAtBuildTime: true, canonicalRule: 'styller-first-then-web-highest-proven-sell-price', items };
  if (options.write !== false) {
    const outputPath = resolve(projectRoot, 'content', 'generated', 'item-economy.json');
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  }
  return catalog;
}
