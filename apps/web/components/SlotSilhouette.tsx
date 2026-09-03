import React from 'react';
import type { CharacterEquipmentSlot } from '@/packages/domain/src';

interface SlotSilhouetteProps {
  slot: CharacterEquipmentSlot | 'neck' | 'backpack' | 'finger' | 'ammo';
  size?: number;
}

export function SlotSilhouette({ slot, size = 32 }: SlotSilhouetteProps) {
  const color = '#363d4a';
  const highlight = '#4f596b';

  switch (slot) {
    case 'head':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Helmet Silhouette */}
          <path
            d="M9 14 C9 7, 23 7, 23 14 L23 20 L21 21 L21 16 L17 16 L17 24 L15 24 L15 16 L11 16 L11 21 L9 20 Z"
            fill={color}
            stroke={highlight}
            strokeWidth="0.8"
          />
          {/* Horns/Visor detail */}
          <path d="M12 11 L16 8 L20 11" stroke={highlight} strokeWidth="1" fill="none" />
          <line x1="12" y1="14" x2="20" y2="14" stroke="#1d2128" strokeWidth="1.2" />
        </svg>
      );

    case 'neck':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Amulet / Necklace Silhouette */}
          <ellipse cx="16" cy="14" rx="8" ry="7" stroke={highlight} strokeWidth="1.2" fill="none" strokeDasharray="2 1.5" />
          <circle cx="16" cy="22" r="3.5" fill={color} stroke={highlight} strokeWidth="1" />
          <circle cx="16" cy="22" r="1.5" fill="#1d2128" />
        </svg>
      );

    case 'backpack':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.55">
          {/* Brown Leather Backpack */}
          <rect x="7" y="10" width="18" height="17" rx="3" fill="#693d1b" stroke="#3d220e" strokeWidth="1" />
          <path d="M7 13 C7 8, 25 8, 25 13 L23 18 C19 19, 13 19, 9 18 Z" fill="#874e22" stroke="#4a2a12" strokeWidth="0.8" />
          <line x1="11" y1="10" x2="11" y2="26" stroke="#361e0b" strokeWidth="1.6" />
          <line x1="21" y1="10" x2="21" y2="26" stroke="#361e0b" strokeWidth="1.6" />
          <rect x="14" y="15" width="4" height="3" rx="0.5" fill="#f5c242" stroke="#876612" strokeWidth="0.6" />
        </svg>
      );

    case 'armor':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Breastplate Armor Silhouette */}
          <path
            d="M11 7 L16 10 L21 7 L25 11 L23 23 L16 26 L9 23 L7 11 Z"
            fill={color}
            stroke={highlight}
            strokeWidth="0.8"
          />
          {/* Shoulder plates & center crease */}
          <path d="M7 11 L11 13 L11 18 L8 17 Z" fill={highlight} opacity="0.5" />
          <path d="M25 11 L21 13 L21 18 L24 17 Z" fill={highlight} opacity="0.5" />
          <line x1="16" y1="10" x2="16" y2="25" stroke={highlight} strokeWidth="1" />
          <path d="M12 17 Q16 19 20 17" stroke={highlight} strokeWidth="0.8" fill="none" />
        </svg>
      );

    case 'leftHand':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Sword / Weapon Silhouette */}
          <path d="M24 7 L25 8 L14 19 L13 18 Z" fill={highlight} />
          <path d="M12 17 L15 20 L13 22 L10 19 Z" fill={color} stroke={highlight} strokeWidth="0.8" />
          <line x1="10" y1="21" x2="7" y2="24" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="6.5" cy="24.5" r="1.5" fill={highlight} />
        </svg>
      );

    case 'rightHand':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Shield Silhouette */}
          <path
            d="M9 8 L23 8 L23 16 C23 22, 16 26, 16 26 C16 26, 9 22, 9 16 Z"
            fill={color}
            stroke={highlight}
            strokeWidth="1"
          />
          <path d="M12 11 L20 11 L20 16 C20 20, 16 23, 16 23 C16 23, 12 20, 12 16 Z" stroke={highlight} strokeWidth="0.8" fill="none" opacity="0.6" />
          <line x1="16" y1="11" x2="16" y2="22" stroke={highlight} strokeWidth="0.8" opacity="0.6" />
        </svg>
      );

    case 'legs':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Plate Legs Silhouette */}
          <path
            d="M9 8 L23 8 L22 17 L19 18 L19 25 L15 25 L15 13 L17 13 L17 11 L15 11 L15 13 L13 25 L9 25 L9 18 Z"
            fill={color}
            stroke={highlight}
            strokeWidth="0.8"
          />
          {/* Knee guard circles */}
          <circle cx="11.5" cy="19.5" r="2" fill={highlight} opacity="0.6" />
          <circle cx="20.5" cy="19.5" r="2" fill={highlight} opacity="0.6" />
        </svg>
      );

    case 'boots':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Boots Silhouette (Pair) */}
          <path d="M9 10 L14 10 L14 20 L16 21 L16 24 L8 24 L8 20 L9 19 Z" fill={color} stroke={highlight} strokeWidth="0.8" />
          <path d="M18 10 L23 10 L23 19 L24 20 L24 24 L16 24 L16 21 L18 20 Z" fill={color} stroke={highlight} strokeWidth="0.8" />
        </svg>
      );

    case 'finger':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Ring Silhouette */}
          <circle cx="16" cy="16" r="7" stroke={highlight} strokeWidth="2" fill="none" />
          <circle cx="16" cy="16" r="5" fill="#141820" />
          <polygon points="16,8 18,10 16,12 14,10" fill={highlight} />
        </svg>
      );

    case 'ammo':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none" opacity="0.45">
          {/* Ammo / Arrow Silhouette */}
          <circle cx="16" cy="16" r="9" stroke={highlight} strokeWidth="0.8" strokeDasharray="3 2" fill="none" />
          <circle cx="16" cy="16" r="3" stroke={highlight} strokeWidth="1" fill="none" />
          <circle cx="16" cy="16" r="1" fill={highlight} />
          <line x1="7" y1="16" x2="25" y2="16" stroke={highlight} strokeWidth="0.8" />
          <line x1="16" y1="7" x2="16" y2="25" stroke={highlight} strokeWidth="0.8" />
        </svg>
      );

    default:
      return null;
  }
}
