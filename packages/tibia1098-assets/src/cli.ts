import { extractTibia1098Assets } from './extractor.ts';
import { createRequire } from 'node:module';

console.log('--- Extracting Tibia 10.98 Assets ---');
const startTime = Date.now();
const result = await extractTibia1098Assets({ write: true });
const duration = Date.now() - startTime;
console.log(
  `Extracted ${result.files.size} asset files in ${duration}ms. Manifest saved to content/generated/tibia1098-assets.json.`,
);

const require = createRequire(import.meta.url);
require('../../../scripts/generate-sire-sprites.cjs');
