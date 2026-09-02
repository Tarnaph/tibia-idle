import { importEquipment } from './importEquipment.ts';
import { importEconomy } from './importEconomy.ts';
import { importMonsters } from './importMonsters.ts';
import { importStarterLoadouts } from './importStarterLoadouts.ts';
import { importVocations } from './importVocations.ts';
import { importSpells } from './importSpells.ts';
import { importHuntRegions } from './importHuntRegions.ts';

const [monsters, equipment, vocations, starters, spells, huntRegions] = await Promise.all([
  importMonsters(),
  importEquipment(),
  importVocations(),
  importStarterLoadouts(),
  importSpells(),
  importHuntRegions(),
]);
const economy = await importEconomy({ monsters });
console.log(
  `Imported ${monsters.monsters.length} monsters, ${equipment.items.length} equipment items, ${vocations.vocations.length} vocations, ${starters.loadouts.length} loadouts, ${spells.spells.length} spells, ${huntRegions.regions.length} OTBM regions and ${economy.items.length} economy entries.`,
);
