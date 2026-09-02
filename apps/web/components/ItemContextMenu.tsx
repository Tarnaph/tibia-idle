'use client';

import { useEffect } from 'react';

export interface ItemMenuAction { label: string; disabled?: boolean; active?: boolean; run(): void }

export function ItemContextMenu({ x, y, title, actions, onClose }: { x: number; y: number; title: string; actions: ItemMenuAction[]; onClose(): void }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    return () => { window.removeEventListener('pointerdown', close); window.removeEventListener('blur', close); };
  }, [onClose]);
  return <div className="item-context-menu" style={{ left: x, top: y }} role="menu" onPointerDown={(event) => event.stopPropagation()}>
    <strong>{title}</strong>
    {actions.map((action) => <button type="button" role="menuitem" key={action.label} disabled={action.disabled} className={action.active ? 'active' : ''} onClick={() => { action.run(); onClose(); }}>{action.active ? '✓ ' : ''}{action.label}</button>)}
  </div>;
}
