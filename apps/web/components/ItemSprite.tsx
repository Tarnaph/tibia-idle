import visualAssetsJson from '@/content/generated/tibia1098-combat-assets.json';
import type { Tibia1098AssetManifest } from '@/packages/tibia1098-assets/src/types';

const visualAssets = visualAssetsJson as unknown as Tibia1098AssetManifest;

interface ItemSpriteProps {
  itemId?: number;
  label: string;
  className?: string;
}

const TEST_ITEM_SPRITE_MAP: Record<number, number> = {
  9900: 2148, // Gold Pack -> Gold Coin
  9901: 2160, // Level Up -> Crystal Coin
  9910: 2160, // Level Up 10 -> Crystal Coin
  9911: 2160, // Level Up 50 -> Crystal Coin
  9912: 1949, // Vocation Reset -> Scroll / Parchment
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

export function resolveItemSpriteUrl(itemId: number | undefined): string | null {
  if (itemId === undefined) return null;
  const mappedId = TEST_ITEM_SPRITE_MAP[itemId] ?? itemId;
  const asset = visualAssets.items[String(mappedId)];
  if (asset?.frame?.publicUrl) {
    return asset.frame.publicUrl;
  }
  return `/generated/cyclopedia/items/item-${mappedId}.png`;
}

export function ItemSprite({ itemId, label, className = '' }: ItemSpriteProps) {
  const asset = itemVisualAsset(itemId);
  const spriteUrl = asset?.frame?.publicUrl ?? resolveItemSpriteUrl(itemId);

  if (!spriteUrl) {
    return <span className={`item-sprite item-sprite-fallback ${className}`} aria-label={`${label}: sprite indisponível`}>?</span>;
  }

  return (
    // Native img preserves the extracted 32px PNG without an optimization pipeline.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`item-sprite ${className}`}
      src={spriteUrl}
      alt={label}
      draggable={false}
      width={asset?.frame?.width ?? 32}
      height={asset?.frame?.height ?? 32}
      onError={(e) => {
        const target = e.currentTarget as HTMLImageElement;
        const mappedId = itemId !== undefined ? (TEST_ITEM_SPRITE_MAP[itemId] ?? itemId) : undefined;
        if (mappedId !== undefined && !target.src.includes('tibia1098')) {
          target.src = `/generated/tibia1098/items/item-${mappedId}.png`;
        }
      }}
    />
  );
}
