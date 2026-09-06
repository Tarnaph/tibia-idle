import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

const visualAssets = visualAssetsJson as Tibia860AssetManifest;

interface ItemSpriteProps {
  itemId?: number;
  label: string;
  className?: string;
}

const TEST_ITEM_SPRITE_MAP: Record<number, number> = {
  9900: 2148, // Gold Pack -> Gold Coin
  9901: 2160, // Level Up -> Crystal Coin
  9902: 2376, // Sword -> Sword
  9903: 2388, // Axe -> Hatchet
  9904: 2398, // Club -> Mace
  9905: 2456, // Distance -> Bow
  9906: 2461, // Shielding / Defense -> Leather Helmet
  9907: 2190, // Magic Level -> Wand of Vortex
  9908: 2467, // Fist -> Leather Armor
  9909: 2544, // Fishing / Hunting -> Arrow
};

export function itemVisualAsset(itemId: number | undefined) {
  if (itemId === undefined) return undefined;
  const mappedId = TEST_ITEM_SPRITE_MAP[itemId] ?? itemId;
  return visualAssets.items[String(mappedId)];
}

export function ItemSprite({ itemId, label, className = '' }: ItemSpriteProps) {
  const asset = itemVisualAsset(itemId);
  if (!asset?.resolved || !asset.frame) {
    return <span className={`item-sprite item-sprite-fallback ${className}`} aria-label={`${label}: sprite indisponível`}>?</span>;
  }
  return (
    // Native img preserves the extracted 32px PNG without an optimization pipeline.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`item-sprite ${className}`}
      src={asset.frame.publicUrl}
      alt=""
      draggable={false}
      width={asset.frame.width}
      height={asset.frame.height}
    />
  );
}
