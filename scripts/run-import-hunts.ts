import { importHuntRegions } from '../packages/realmap11-importer/src/importHuntRegions.ts';

async function run() {
  console.log('Running importHuntRegions...');
  const catalog = await importHuntRegions({ write: true });
  console.log('Successfully imported hunt regions:', catalog.regions.length);
  for (const r of catalog.regions) {
    const walkable = r.tiles.filter((t) => t.walkable).length;
    console.log(`- ${r.huntId} (${r.name}): ${r.tiles.length} tiles (${walkable} walkable), center: (${r.sourceCenter.x}, ${r.sourceCenter.y}, ${r.sourceCenter.z})`);
  }
}

run().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
