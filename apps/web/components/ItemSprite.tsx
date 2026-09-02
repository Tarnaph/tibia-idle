import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';

const visualAssets = visualAssetsJson as Tibia860AssetManifest;

interface ItemSpriteProps {
  itemId?: number;
  label: string;
  className?: string;
}

export function itemVisualAsset(itemId: number | undefined) {
  return itemId === undefined ? undefined : visualAssets.items[String(itemId)];
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
