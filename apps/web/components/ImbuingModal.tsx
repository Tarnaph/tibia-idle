'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { EquipmentDefinition } from '@/packages/content-schema/src';
import type {
  CharacterEquipmentSlot,
  CharacterState,
} from '@/packages/domain/src/types';
import {
  CANONICAL_IMBUEMENTS,
  IMBUEMENT_TIER_COSTS,
  getItemImbuingSlots,
  getApplicableImbuements,
  formatImbuementRemainingTime,
  type ActiveImbuementSlot,
  type ImbuementDefinition,
  type ImbuementTier,
} from '@/packages/domain/src/imbuements';
import { ItemSprite } from './ItemSprite';
import { showGlobalItemTooltip, hideGlobalItemTooltip } from './GlobalItemTooltip';

interface ImbuingModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterState[];
  selectedCharacterId: string;
  equipmentCatalog: EquipmentDefinition[];
  partyGold: number;
  onImbueItem: (
    characterId: string,
    target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
    imbuementId: string,
    tier: ImbuementTier,
    autoRenew: boolean
  ) => Promise<boolean>;
  onClearSlot: (
    characterId: string,
    target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
    slotIndex: number
  ) => Promise<boolean>;
  onToggleAutoRenew: (
    characterId: string,
    target: { kind: 'equipment'; slot: CharacterEquipmentSlot } | { kind: 'backpack'; index: number; serverId: number },
    slotIndex: number,
    autoRenew: boolean
  ) => Promise<boolean>;
}

// Render canonical imbuement icon SVG
function ImbuementIcon({ iconId, size = 32 }: { iconId: string; size?: number }) {
  const s = size;
  switch (iconId) {
    case 'void':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#2d1b4e" />
          <path d="M16 5 L20 12 L27 16 L20 20 L16 27 L12 20 L5 16 L12 12 Z" fill="#b779ff" stroke="#e0b8ff" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="3" fill="#ffffff" />
        </svg>
      );
    case 'vampirism':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#4a1515" />
          <path d="M16 6 C12 12 8 16 8 21 A8 8 0 0 0 24 21 C24 16 20 12 16 6 Z" fill="#e53e3e" stroke="#feb2b2" strokeWidth="1.5" />
          <path d="M13 18 L14 23 L15 18 M17 18 L18 23 L19 18" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'strike':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#3a2f14" />
          <path d="M7 25 L21 11 M21 11 L25 7 M25 7 L23 13 M25 7 L19 9" stroke="#f6e05e" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="16" cy="16" r="11" stroke="#ecc94b" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    case 'slash':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#242b35" />
          <path d="M8 24 L22 10 M22 10 L25 7 L21 7 L22 10 M22 10 L25 13" stroke="#cbd5e0" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M6 26 L10 22 M8 24 L5 27" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'chop':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#322424" />
          <path d="M9 25 L21 13" stroke="#a0aec0" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 9 C22 6 27 7 26 12 C24 16 19 17 17 14 Z" fill="#cbd5e0" stroke="#e2e8f0" strokeWidth="1.5" />
        </svg>
      );
    case 'bash':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#282a2e" />
          <path d="M9 25 L19 15" stroke="#a0aec0" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="21" cy="11" r="5" fill="#718096" stroke="#cbd5e0" strokeWidth="2" />
          <circle cx="21" cy="11" r="2" fill="#e2e8f0" />
        </svg>
      );
    case 'precision':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#1b3320" />
          <circle cx="16" cy="16" r="10" stroke="#68d391" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="5" stroke="#9ae6b4" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="2" fill="#ffffff" />
          <path d="M16 4 L16 8 M16 24 L16 28 M4 16 L8 16 M24 16 L28 16" stroke="#68d391" strokeWidth="1.5" />
        </svg>
      );
    case 'blockade':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#2c2a38" />
          <path d="M16 6 L24 9 V17 C24 22 16 26 16 26 C16 26 8 22 8 17 V9 Z" fill="#4a5568" stroke="#cbd5e0" strokeWidth="1.5" />
          <circle cx="16" cy="15" r="3" fill="#ecc94b" />
        </svg>
      );
    case 'epiphany':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#182c44" />
          <path d="M16 6 L26 12 L26 22 L16 28 L6 22 L6 12 Z" fill="#2b6cb0" stroke="#63b3ed" strokeWidth="1.5" />
          <path d="M16 11 L19 16 L16 21 L13 16 Z" fill="#bee3f8" />
        </svg>
      );
    case 'swiftness':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#1f332c" />
          <path d="M8 20 C10 16 14 14 18 14 C22 14 26 18 26 22 C22 22 12 24 8 20 Z" fill="#38a169" stroke="#9ae6b4" strokeWidth="1.5" />
          <path d="M14 10 L22 10 M11 13 L19 13" stroke="#68d391" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'featherweight':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#3b3224" />
          <path d="M8 24 C14 22 20 16 24 8 C20 12 14 14 8 16 Z" fill="#d69e2e" stroke="#faf089" strokeWidth="1.5" />
          <path d="M8 24 L16 16" stroke="#faf089" strokeWidth="1" />
        </svg>
      );
    case 'snakeskin':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#20331b" />
          <circle cx="16" cy="16" r="10" fill="#2f855a" stroke="#68d391" strokeWidth="1.5" />
          <path d="M11 16 Q16 10 21 16 Q16 22 11 16" stroke="#c6f6d5" strokeWidth="2" fill="none" />
        </svg>
      );
    case 'hidedragon':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#421a1a" />
          <path d="M16 6 L23 14 L19 26 L13 26 L9 14 Z" fill="#c53030" stroke="#feb2b2" strokeWidth="1.5" />
          <circle cx="16" cy="15" r="3" fill="#fbd38d" />
        </svg>
      );
    case 'quarascale':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#143047" />
          <path d="M16 6 C22 12 24 20 16 26 C8 20 10 12 16 6 Z" fill="#3182ce" stroke="#90cdf4" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="4" fill="#ebf8ff" />
        </svg>
      );
    case 'cloudfabric':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#36284a" />
          <path d="M10 20 C8 16 10 12 14 12 C16 9 20 9 22 12 C25 12 26 15 24 18 C23 21 19 22 16 22 C13 22 11 22 10 20 Z" fill="#805ad5" stroke="#d6bcfa" strokeWidth="1.5" />
          <path d="M17 14 L14 18 L17 18 L15 22" stroke="#faf089" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'demonpresence':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#2b1424" />
          <circle cx="16" cy="16" r="8" fill="#553c9a" stroke="#b794f4" strokeWidth="1.5" />
          <circle cx="13" cy="15" r="2" fill="#fc8181" />
          <circle cx="19" cy="15" r="2" fill="#fc8181" />
        </svg>
      );
    case 'sanctified':
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#383318" />
          <path d="M16 6 V26 M8 13 H24" stroke="#d69e2e" strokeWidth="3" strokeLinecap="square" />
          <circle cx="16" cy="13" r="7" stroke="#faf089" strokeWidth="1.5" fill="none" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="4" fill="#2d3748" />
          <circle cx="16" cy="16" r="6" fill="#a0aec0" />
        </svg>
      );
  }
}

// Helper to render red tier dots
function TierDots({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '3px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <span
          key={idx}
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: '#e53e3e',
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
}

export function ImbuingModal({
  isOpen,
  onClose,
  characters,
  selectedCharacterId,
  equipmentCatalog,
  partyGold,
  onImbueItem,
  onClearSlot,
  onToggleAutoRenew,
}: ImbuingModalProps) {
  // Selected character in the modal (defaults to selectedCharacterId or first party member)
  const [activeCharId, setActiveCharId] = useState<string>(() => selectedCharacterId || characters[0]?.id || '');
  const activeChar = useMemo(
    () => characters.find((c) => c.id === activeCharId) || characters[0],
    [characters, activeCharId]
  );

  // Selected item state: either an equipment slot or a backpack index
  const [selectedTarget, setSelectedTarget] = useState<
    | { kind: 'equipment'; slot: CharacterEquipmentSlot; serverId: number }
    | { kind: 'backpack'; index: number; serverId: number }
    | null
  >(null);

  // Selected slot index on the item (0, 1, 2)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  // Form selection for empty slot:
  const [selectedTier, setSelectedTier] = useState<ImbuementTier>('Powerful');
  const [selectedImbuementId, setSelectedImbuementId] = useState<string | null>(null);
  const [autoRenewChoice, setAutoRenewChoice] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Find equipment definition for the selected item
  const selectedItemDef = useMemo(() => {
    if (!selectedTarget) return null;
    return equipmentCatalog.find((eq) => eq.id === selectedTarget.serverId) || null;
  }, [selectedTarget, equipmentCatalog]);

  // Total imbuement slots for selected item
  const maxSlots = useMemo(() => {
    if (!selectedTarget) return 0;
    return getItemImbuingSlots(selectedTarget.serverId, equipmentCatalog);
  }, [selectedTarget, equipmentCatalog]);

  // Existing active imbuements on the selected item
  const activeImbuements: ActiveImbuementSlot[] = useMemo(() => {
    if (!activeChar || !selectedTarget) return [];
    if (selectedTarget.kind === 'equipment') {
      const attr = activeChar.equipmentAttributes?.[selectedTarget.slot];
      return Array.isArray(attr?.imbuements) ? attr.imbuements : [];
    }
    return [];
  }, [activeChar, selectedTarget]);

  // Active imbuement for the currently selected slot index (if any)
  const currentSlotImbuement = useMemo(() => {
    return activeImbuements.find((s) => s.slotIndex === selectedSlotIndex) || null;
  }, [activeImbuements, selectedSlotIndex]);

  // Applicable imbuements for the selected item's category
  const applicableImbuements = useMemo(() => {
    if (!selectedTarget) return [];
    const item = selectedItemDef || { serverId: selectedTarget.serverId };
    return getApplicableImbuements(item);
  }, [selectedTarget, selectedItemDef]);

  // Selected imbuement definition
  const selectedImbuementDef = useMemo(() => {
    if (!selectedImbuementId) return null;
    return CANONICAL_IMBUEMENTS.find((i: ImbuementDefinition) => i.id === selectedImbuementId) || null;
  }, [selectedImbuementId]);

  // Cost calculation
  const imbuingCost = useMemo(() => {
    return IMBUEMENT_TIER_COSTS[selectedTier] || 250000;
  }, [selectedTier]);

  const canAfford = partyGold >= imbuingCost;

  // Handle switching hero
  const handleSelectChar = (charId: string) => {
    setActiveCharId(charId);
    setSelectedTarget(null);
    setSelectedSlotIndex(0);
    setSelectedImbuementId(null);
  };

  // Handle selecting an equipment slot
  const handleSelectEquipSlot = (slot: CharacterEquipmentSlot) => {
    if (!activeChar) return;
    const serverId = activeChar.equipment[slot];
    if (!serverId) return;
    const slotsCount = getItemImbuingSlots(serverId, equipmentCatalog);
    if (slotsCount === 0) return; // Ignore items without imbuement slots

    setSelectedTarget({ kind: 'equipment', slot, serverId });
    setSelectedSlotIndex(0);
    setSelectedImbuementId(null);
  };

  // Handle selecting a backpack item
  const handleSelectBackpackItem = (serverId: number, index: number) => {
    const slotsCount = getItemImbuingSlots(serverId, equipmentCatalog);
    if (slotsCount === 0) return;

    setSelectedTarget({ kind: 'backpack', index, serverId });
    setSelectedSlotIndex(0);
    setSelectedImbuementId(null);
  };

  // Execute imbuing action
  const handleImbue = async () => {
    if (!activeChar || !selectedTarget || !selectedImbuementId || isProcessing || !canAfford) return;
    setIsProcessing(true);
    try {
      await onImbueItem(
        activeChar.id,
        selectedTarget,
        selectedImbuementId,
        selectedTier,
        autoRenewChoice
      );
      setSelectedImbuementId(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute clear slot action (grátis)
  const handleClear = async () => {
    if (!activeChar || !selectedTarget || isProcessing) return;
    setIsProcessing(true);
    try {
      await onClearSlot(activeChar.id, selectedTarget, selectedSlotIndex);
    } finally {
      setIsProcessing(false);
    }
  };

  // Toggle auto renew on active slot
  const handleToggleAutoRenew = async (checked: boolean) => {
    if (!activeChar || !selectedTarget || !currentSlotImbuement || isProcessing) return;
    setIsProcessing(true);
    try {
      await onToggleAutoRenew(activeChar.id, selectedTarget, selectedSlotIndex, checked);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !activeChar) return null;

  // Paperdoll items
  const eq = activeChar.equipment;
  const getSlotsCount = (id: number | null | undefined) => (id ? getItemImbuingSlots(id, equipmentCatalog) : 0);

  // Backpack items that have imbuing slots
  const backpackItemIds = activeChar.inventory?.equipmentIds || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '780px',
          maxWidth: '96vw',
          height: '620px',
          maxHeight: '92vh',
          backgroundColor: '#232629',
          border: '1.5px solid #3d4147',
          borderRadius: '8px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#d1d5db',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #33373d',
            backgroundColor: '#1c1e21',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#f3d37a',
              fontFamily: 'Cinzel, Georgia, serif',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '1px',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            Imbuir
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              right: '16px',
              background: 'none',
              border: 'none',
              color: '#8c95a0',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
            }}
            title="Fechar"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Column (Character & Inventory) */}
          <div
            style={{
              width: '280px',
              borderRight: '1px solid #33373d',
              backgroundColor: '#1c1e21',
              display: 'flex',
              flexDirection: 'column',
              padding: '14px',
              gap: '12px',
            }}
          >
            {/* Party Hero Tabs */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {characters.slice(0, 4).map((char) => {
                const isActive = char.id === activeChar.id;
                const vocShort = char.vocation ? char.vocation.substring(0, 2).toUpperCase() : 'EK';
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => handleSelectChar(char.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 4px',
                      backgroundColor: isActive ? '#2b2f36' : '#181a1c',
                      border: isActive ? '1.5px solid #d4a34b' : '1px solid #31353b',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 0 8px rgba(212, 163, 75, 0.3)' : 'none',
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px' }}>⚔️</span>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: isActive ? '#f3d37a' : '#8c95a0',
                        marginTop: '2px',
                      }}
                    >
                      {vocShort}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Set de Character */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12px', color: '#8c95a0', marginBottom: '8px', fontWeight: 600 }}>
                Set de {activeChar.name}
              </div>

              {/* Paperdoll Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 44px)',
                  gridTemplateRows: 'repeat(4, 44px)',
                  gap: '8px',
                  justifyContent: 'center',
                  padding: '8px 0',
                }}
              >
                {/* Row 1: Necklace (empty/placeholder), Head, (blank) */}
                <div style={{ opacity: 0.35, backgroundColor: '#141618', border: '1px solid #2a2d32', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6b7280' }}>
                  Colar
                </div>
                {/* Head */}
                {(() => {
                  const id = eq.head;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'head';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('head')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}
                <div style={{ visibility: 'hidden' }} />

                {/* Row 2: leftHand (Weapon), armor, rightHand (Shield) */}
                {/* leftHand (Weapon) */}
                {(() => {
                  const id = eq.leftHand;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'leftHand';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('leftHand')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}
                {/* armor */}
                {(() => {
                  const id = eq.armor;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'armor';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('armor')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}
                {/* rightHand (Shield) */}
                {(() => {
                  const id = eq.rightHand;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'rightHand';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('rightHand')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}

                {/* Row 3: Ring, Legs, Trinket */}
                <div style={{ opacity: 0.35, backgroundColor: '#141618', border: '1px solid #2a2d32', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#6b7280' }}>
                  Anel
                </div>
                {/* legs */}
                {(() => {
                  const id = eq.legs;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'legs';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('legs')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}
                <div style={{ opacity: 0.35, backgroundColor: '#141618', border: '1px solid #2a2d32', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#6b7280' }}>
                  Berloque
                </div>

                {/* Row 4: (blank), Boots, (blank) */}
                <div style={{ visibility: 'hidden' }} />
                {/* boots */}
                {(() => {
                  const id = eq.boots;
                  const slots = getSlotsCount(id);
                  const isSelected = selectedTarget?.kind === 'equipment' && selectedTarget.slot === 'boots';
                  return (
                    <button
                      type="button"
                      onClick={() => handleSelectEquipSlot('boots')}
                      disabled={slots === 0}
                      style={{
                        width: '44px',
                        height: '44px',
                        backgroundColor: '#141618',
                        border: isSelected ? '2px solid #f7d046' : '1px solid #3a3f47',
                        borderRadius: '4px',
                        padding: 0,
                        cursor: slots > 0 ? 'pointer' : 'default',
                        opacity: slots > 0 ? 1 : 0.35,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.5)' : 'none',
                      }}
                    >
                      {id ? <ItemSprite itemId={id} size={32} /> : null}
                    </button>
                  );
                })()}
                <div style={{ visibility: 'hidden' }} />
              </div>
            </div>

            {/* Mochila Row */}
            <div>
              <div style={{ fontSize: '12px', color: '#8c95a0', marginBottom: '6px', fontWeight: 600 }}>
                Mochila
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  padding: '4px 0',
                  minHeight: '44px',
                }}
              >
                {backpackItemIds.length === 0 ? (
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>Nenhum item na mochila</span>
                ) : (
                  backpackItemIds.slice(0, 10).map((itemId, idx) => {
                    const slots = getSlotsCount(itemId);
                    const isSelected = selectedTarget?.kind === 'backpack' && selectedTarget.index === idx;
                    return (
                      <button
                        key={`${itemId}-${idx}`}
                        type="button"
                        onClick={() => handleSelectBackpackItem(itemId, idx)}
                        disabled={slots === 0}
                        style={{
                          width: '40px',
                          height: '40px',
                          flexShrink: 0,
                          backgroundColor: '#141618',
                          border: isSelected ? '2px solid #f7d046' : '1px solid #31353b',
                          borderRadius: '4px',
                          padding: 0,
                          cursor: slots > 0 ? 'pointer' : 'default',
                          opacity: slots > 0 ? 1 : 0.35,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isSelected ? '0 0 8px rgba(247, 208, 70, 0.5)' : 'none',
                        }}
                      >
                        <ItemSprite itemId={itemId} size={28} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Party Vault Balance */}
            <div
              style={{
                backgroundColor: '#121416',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #2a2d32',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ecc94b', display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#f7fafc', letterSpacing: '0.5px' }}>
                {partyGold.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Right Area (Main workspace) */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#232629',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 20px',
              overflowY: 'auto',
            }}
          >
            {!selectedTarget || maxSlots === 0 ? (
              // Empty State (Screenshot 1)
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '40px',
                  color: '#8c95a0',
                  fontSize: '15px',
                  lineHeight: '1.6',
                }}
              >
                Selecione um item com slots de imbuement (os apagados não têm).
              </div>
            ) : (
              // Item Selected State (Screenshot 2 & 3)
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Header: Item Details & Slot Selectors */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '14px',
                    borderBottom: '1px solid #33373d',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      onMouseEnter={(e) =>
                        selectedItemDef &&
                        showGlobalItemTooltip(
                          {
                            item: selectedItemDef,
                            itemId: selectedItemDef.id,
                            name: selectedItemDef.name,
                            attributes: { imbuements: activeImbuements },
                            equippedInName: selectedTarget.kind === 'equipment' ? activeChar?.name : undefined,
                          },
                          e
                        )
                      }
                      onMouseMove={(e) =>
                        selectedItemDef &&
                        showGlobalItemTooltip(
                          {
                            item: selectedItemDef,
                            itemId: selectedItemDef.id,
                            name: selectedItemDef.name,
                            attributes: { imbuements: activeImbuements },
                            equippedInName: selectedTarget.kind === 'equipment' ? activeChar?.name : undefined,
                          },
                          e
                        )
                      }
                      onMouseLeave={() => hideGlobalItemTooltip()}
                      style={{
                        width: '52px',
                        height: '52px',
                        backgroundColor: '#181a1c',
                        border: '1.5px solid #3a3f47',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <ItemSprite itemId={selectedTarget.serverId} size={40} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', letterSpacing: '0.5px' }}>
                        {selectedItemDef?.name?.toUpperCase() || 'EQUIPAMENTO'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                        {maxSlots} slot(s) de imbuement
                      </div>
                    </div>
                  </div>

                  {/* Slot selector boxes */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {Array.from({ length: maxSlots }).map((_, idx) => {
                      const activeSlot = activeImbuements.find((s) => s.slotIndex === idx);
                      const isSelected = selectedSlotIndex === idx;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSlotIndex(idx)}
                          style={{
                            width: '56px',
                            height: '56px',
                            backgroundColor: '#181a1c',
                            border: isSelected ? '2px solid #f7d046' : '1.5px solid #3a3f47',
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px',
                            position: 'relative',
                            boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.4)' : 'none',
                          }}
                        >
                          {activeSlot ? (
                            <>
                              <ImbuementIcon iconId={activeSlot.imbuementId} size={26} />
                              <TierDots count={activeSlot.tier === 'Powerful' ? 3 : activeSlot.tier === 'Intricate' ? 2 : 1} />
                              <span style={{ fontSize: '9px', fontWeight: 700, color: '#f7d046', marginTop: '1px' }}>
                                {formatImbuementRemainingTime(activeSlot.remainingSeconds)}
                              </span>
                              {activeSlot.autoRenew && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '2px',
                                    right: '2px',
                                    fontSize: '10px',
                                    color: '#ecc94b',
                                  }}
                                  title="Renovação automática ativa"
                                >
                                  ↻
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: '24px', color: '#8c95a0', fontWeight: 300 }}>+</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Action Area: Either Active Imbuement Details OR Empty Imbuing Form */}
                {currentSlotImbuement ? (
                  // Active Imbuement Details (Screenshot 3)
                  <div
                    style={{
                      backgroundColor: '#1c1e21',
                      border: '1px solid #33373d',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6' }}>
                        {currentSlotImbuement.name} {currentSlotImbuement.tier}
                      </div>
                      <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '4px' }}>
                        {currentSlotImbuement.effectDescription} · {formatImbuementRemainingTime(currentSlotImbuement.remainingSeconds)} de caça restantes
                      </div>
                    </div>

                    {/* Auto Renew Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #2b2f36' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#e5e7eb' }}>
                          <input
                            type="checkbox"
                            checked={currentSlotImbuement.autoRenew}
                            onChange={(e) => handleToggleAutoRenew(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#d4a34b' }}
                          />
                          Renovação automática
                        </label>
                        <div style={{ fontSize: '11px', color: '#8c95a0', marginLeft: '24px', marginTop: '2px' }}>
                          {currentSlotImbuement.cost.toLocaleString('pt-BR')} gold por renovação, ao acabar o tempo
                        </div>
                      </div>

                      {/* Limpar Slot (grátis) Button */}
                      <button
                        type="button"
                        onClick={handleClear}
                        disabled={isProcessing}
                        style={{
                          backgroundColor: '#2d333b',
                          border: '1px solid #484f58',
                          color: '#e2e8f0',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '6px 14px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Limpar slot (grátis)
                      </button>
                    </div>
                  </div>
                ) : (
                  // Empty Slot: Imbuing Form (Screenshot 2)
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Tier Selector */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(['Basic', 'Intricate', 'Powerful'] as ImbuementTier[]).map((tier) => {
                        const isSelected = selectedTier === tier;
                        const cost = IMBUEMENT_TIER_COSTS[tier];
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setSelectedTier(tier)}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              backgroundColor: isSelected ? '#2d2e30' : '#1a1c1e',
                              border: isSelected ? '1.5px solid #d4a34b' : '1px solid #33373d',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: isSelected ? '0 0 8px rgba(212, 163, 75, 0.3)' : 'none',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 700, color: isSelected ? '#f3d37a' : '#d1d5db' }}>
                              {tier}
                            </span>
                            <span style={{ fontSize: '12px', color: isSelected ? '#f3d37a' : '#9ca3af' }}>·</span>
                            <span style={{ fontSize: '12px', color: isSelected ? '#f3d37a' : '#9ca3af', fontWeight: 600 }}>
                              {cost.toLocaleString('pt-BR')} gp
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Imbuement Cards Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '8px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        padding: '4px',
                      }}
                    >
                      {applicableImbuements.map((imb: ImbuementDefinition) => {
                        const isSelected = selectedImbuementId === imb.id;
                        const tierInfo = imb.tiers[selectedTier];
                        const dotsCount = selectedTier === 'Powerful' ? 3 : selectedTier === 'Intricate' ? 2 : 1;

                        return (
                          <button
                            key={imb.id}
                            type="button"
                            onClick={() => setSelectedImbuementId(imb.id)}
                            style={{
                              backgroundColor: isSelected ? '#2d333b' : '#181b1e',
                              border: isSelected ? '2px solid #f7d046' : '1px solid #33373d',
                              borderRadius: '6px',
                              padding: '10px 6px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 0 10px rgba(247, 208, 70, 0.4)' : 'none',
                            }}
                            title={`${imb.name} (${tierInfo.label})`}
                          >
                            <ImbuementIcon iconId={imb.icon} size={30} />
                            <TierDots count={dotsCount} />
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: isSelected ? '#f3d37a' : '#e2e8f0',
                                marginTop: '4px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                              }}
                            >
                              {imb.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Auto Renew Checkbox */}
                    <div
                      style={{
                        backgroundColor: '#1a1c1e',
                        border: '1px solid #2d3137',
                        borderRadius: '6px',
                        padding: '10px 14px',
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: '#f3f4f6' }}>
                        <input
                          type="checkbox"
                          checked={autoRenewChoice}
                          onChange={(e) => setAutoRenewChoice(e.target.checked)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#d4a34b' }}
                        />
                        Renovar automaticamente quando acabar
                      </label>
                      <div style={{ fontSize: '11px', color: '#8c95a0', marginLeft: '24px', marginTop: '2px' }}>
                        Cobra {imbuingCost.toLocaleString('pt-BR')} gold a cada renovação · sem gold, expira normalmente
                      </div>
                    </div>

                    {/* Big Action IMBUIR Button */}
                    <button
                      type="button"
                      onClick={handleImbue}
                      disabled={!selectedImbuementId || isProcessing || !canAfford}
                      style={{
                        padding: '12px',
                        backgroundColor: selectedImbuementId && canAfford ? '#b7892b' : '#2b2e33',
                        backgroundImage: selectedImbuementId && canAfford ? 'linear-gradient(180deg, #d4a34b 0%, #9a6e1a 100%)' : 'none',
                        border: selectedImbuementId && canAfford ? '1.5px solid #f3d37a' : '1px solid #3a3f47',
                        borderRadius: '6px',
                        cursor: selectedImbuementId && canAfford ? 'pointer' : 'not-allowed',
                        color: selectedImbuementId && canAfford ? '#1a160d' : '#6b7280',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedImbuementId && canAfford ? '0 4px 12px rgba(183, 137, 43, 0.4)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        IMBUIR
                      </span>
                      <span style={{ fontSize: '11px', marginTop: '2px', fontWeight: 500, opacity: 0.9 }}>
                        {!selectedImbuementId
                          ? 'Escolha um imbuement acima.'
                          : !canAfford
                          ? `Gold insuficiente (${imbuingCost.toLocaleString('pt-BR')} gp necessários)`
                          : `Custo: ${imbuingCost.toLocaleString('pt-BR')} gold da Party`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #33373d',
            backgroundColor: '#1c1e21',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 20px',
              backgroundColor: '#2b2e34',
              border: '1px solid #444a54',
              borderRadius: '5px',
              color: '#d1d5db',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
