import { extractTibia860Assets } from './extractor.ts';

const result = await extractTibia860Assets();
const { format, assets, items } = result.manifest;
const resolvedItems = Object.values(items).filter((item) => item.resolved).length;

console.log(
  `Tibia ${format.identifiedVersion}: DAT ${format.datSignature}, SPR ${format.sprSignature}; `
  + `Rotworm sprites ${assets.rotworm.frames.flatMap((frame) => frame.spriteIds).join(', ')}; `
  + `${resolvedItems}/${Object.keys(items).length} item icons resolved`,
);
