import type { EquipmentTransferSource } from '@/packages/domain/src';

const EQUIPMENT_MIME = 'application/x-mmorpg-web-equipment';

export function writeEquipmentDrag(event: DragEvent, source: EquipmentTransferSource): void {
  event.dataTransfer?.setData(EQUIPMENT_MIME, JSON.stringify(source));
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

export function readEquipmentDrag(event: DragEvent): EquipmentTransferSource | null {
  const raw = event.dataTransfer?.getData(EQUIPMENT_MIME);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<EquipmentTransferSource>;
    if (value.kind === 'inventory' && typeof value.itemId === 'number') {
      return { kind: 'inventory', itemId: value.itemId };
    }
    if (
      value.kind === 'equipped'
      && ['head', 'armor', 'legs', 'boots', 'leftHand', 'rightHand'].includes(String(value.slot))
    ) {
      return { kind: 'equipped', slot: value.slot! };
    }
  } catch {
    return null;
  }
  return null;
}
