export type AppearanceCategory = 'item' | 'creature' | 'effect' | 'missile';

export interface AppearanceDimensions {
  width: number;
  height: number;
  exactSize: number;
  layers: number;
  patternX: number;
  patternY: number;
  patternZ: number;
  frames: number;
}

export interface TibiaAppearance extends AppearanceDimensions {
  id: number;
  category: AppearanceCategory;
  attributes: number[];
  spriteIds: number[];
}

export interface TibiaDatFile {
  signature: number;
  byteLength: number;
  counts: Record<AppearanceCategory, number>;
  appearances: Record<AppearanceCategory, Map<number, TibiaAppearance>>;
  parsedBytes: number;
}

export interface ExtractedFrame {
  frame: number;
  direction: string;
  pattern: { x: number; y: number; z: number };
  layer: number;
  spriteIds: number[];
  file: string;
  publicUrl: string;
  sha256: string;
  width: number;
  height: number;
}

export type VisualAssetKey =
  | 'rotworm'
  | 'aldric'
  | 'floor'
  | 'caveGround'
  | 'caveWall'
  | 'obstacle'
  | 'entrance'
  | 'exit'
  | 'trainingFloor'
  | 'trainingWall'
  | 'trainingRug'
  | 'trainingDummy'
  | 'trainingDecor'
  | `monster-${string}`
  | `outfit-${string}`
  | `effect-${number}`
  | `missile-${number}`;

export interface VisualAssetMapping {
  key: VisualAssetKey;
  kind: AppearanceCategory;
  label: string;
  appearanceId: number;
  sourceId: number;
  sourceFile: string;
  relationship: 'direct-look-type' | 'selected-outfit' | 'otb-client-id' | 'direct-visual-id';
  validation: string;
  appearance: AppearanceDimensions & {
    attributes: number[];
    spriteIds: number[];
  };
  extractedPattern: { x: number; y: number; z: number };
  extractedLayer: number;
  frames: ExtractedFrame[];
  notes: string[];
}

export interface ItemVisualAssetMapping {
  serverId: number;
  clientId: number | null;
  group: number | null;
  name: string;
  resolved: boolean;
  source: {
    serverId: number;
    otb: 'styller-master/data/items/items.otb';
    dat: 'tibia-860-client/Tibia.dat';
    spr: 'tibia-860-client/Tibia.spr';
  };
  appearanceId: number | null;
  appearance: (AppearanceDimensions & {
    attributes: number[];
    spriteIds: number[];
  }) | null;
  extractedPattern: { x: number; y: number; z: number } | null;
  extractedLayer: number | null;
  frame: ExtractedFrame | null;
  importWarnings: string[];
}

export interface Tibia860AssetManifest {
  schemaVersion: 1;
  format: {
    family: 'legacy-tibia-dat-spr';
    identifiedVersion: '8.60';
    datSignature: string;
    sprSignature: string;
    counts: Record<AppearanceCategory | 'sprites', number>;
    parsedDatBytes: number;
  };
  sources: {
    dat: SourceFingerprint;
    spr: SourceFingerprint;
    rotworm: SourceFingerprint & { lookType: number };
    itemsOtb: SourceFingerprint;
  };
  assets: {
    rotworm: VisualAssetMapping;
    aldric: VisualAssetMapping;
    floor: VisualAssetMapping & { serverId: number; clientId: number };
    caveGround: VisualAssetMapping & { serverId: number; clientId: number };
    caveWall: VisualAssetMapping & { serverId: number; clientId: number };
    obstacle: VisualAssetMapping & { serverId: number; clientId: number };
    entrance: VisualAssetMapping & { serverId: number; clientId: number };
    exit: VisualAssetMapping & { serverId: number; clientId: number };
    trainingFloor: VisualAssetMapping & { serverId: number; clientId: number };
    trainingWall: VisualAssetMapping & { serverId: number; clientId: number };
    trainingRug: VisualAssetMapping & { serverId: number; clientId: number };
    trainingDummy: VisualAssetMapping & { serverId: number; clientId: number };
    trainingDecor: VisualAssetMapping & { serverId: number; clientId: number };
  };
  creatures: Record<string, VisualAssetMapping>;
  outfits: Record<string, VisualAssetMapping>;
  corpses: Record<string, ItemVisualAssetMapping>;
  items: Record<string, ItemVisualAssetMapping>;
  mapItems: Record<string, ItemVisualAssetMapping>;
  effects: Record<string, VisualAssetMapping>;
  missiles: Record<string, VisualAssetMapping>;
  limitations: string[];
}

export interface SourceFingerprint {
  sourceFile: string;
  byteLength: number;
  sha256: string;
}

export interface ExtractionResult {
  manifest: Tibia860AssetManifest;
  files: Map<string, Buffer>;
}
