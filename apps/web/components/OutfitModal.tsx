import React, { useState, useEffect, useRef } from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import rawMountsJson from '@/content/generated/mounts.json';
import {
  TIBIA_133_COLORS,
  normalizeOutfitId,
  renderRecoloredOutfit,
  preloadOutfitAllFrames,
  type OutfitColors,
} from '@/apps/web/lib/outfitRecolor';

export { TIBIA_133_COLORS } from '@/apps/web/lib/outfitRecolor';

export interface OutfitOption {
  id: string;
  name: string;
  description: string;
  vocationHint?: string;
  isCustom?: boolean;
  isPremium?: boolean;
}

export interface MountOption {
  id: string;
  name: string;
  speedBonus: number;
  description: string;
  isPremium?: boolean;
}

export const AVAILABLE_OUTFITS: OutfitOption[] = [
  { id: 'Citizen', name: 'Citizen', description: 'Vestimenta padrão dos habitantes de Thais e Carlin.' },
  { id: 'Hunter', name: 'Hunter', description: 'Traje de sobrevivência e rastreamento florestal.' },
  { id: 'Mage', name: 'Mage', description: 'Toga cerimonial tradicional dos mestres da magia.' },
  { id: 'Knight', name: 'Knight', description: 'Traje de combate pesado de cavaleiro clássico.', vocationHint: 'Knight' },
  { id: 'Noble', name: 'Noble', description: 'Traje elegante de alta nobreza com cartola e capa.', isPremium: true },
  { id: 'Summoner', name: 'Summoner', description: 'Manto de invocador com capuz e frasco de elixires.', isPremium: true },
  { id: 'Warrior', name: 'Warrior', description: 'Armadura tradicional com ombreiras e espadas cruzadas.', isPremium: true },
  { id: 'Barbarian', name: 'Barbarian', description: 'Traje rústico de guerreiro bárbaro do norte.', isPremium: true },
  { id: 'Sire', name: 'Sire', description: 'Cultista arcano com manto sombrio e máscara esquelética.', isCustom: true },
  { id: 'Druid', name: 'Druid', description: 'Manto elemental abençoado pelas forças da natureza.', vocationHint: 'Druid', isPremium: true },
  { id: 'Sorcerer', name: 'Sorcerer', description: 'Roupagem mística de feiticeiro com símbolos arcanos.', vocationHint: 'Sorcerer', isPremium: true },
  { id: 'Paladin', name: 'Paladin', description: 'Vestimenta de caçador ágil com aljava e botas leves.', vocationHint: 'Paladin', isPremium: true },
  { id: 'Oriental', name: 'Oriental', description: 'Vestimentas exóticas do distante continente oriental.', isPremium: true },
  { id: 'Pirate', name: 'Pirate', description: 'Traje clássico de bucaneiro dos sete mares.', isPremium: true },
  { id: 'Assassin', name: 'Assassin', description: 'Vestimenta de mestre assassino das sombras.', isPremium: true },
  { id: 'Beggar', name: 'Beggar', description: 'Vestimenta humilde de andarilho aventureiro.', isPremium: true },
];

const PARSED_MOUNTS: MountOption[] = (rawMountsJson as Array<{
  id: string;
  name: string;
  speedBonus: number;
  description: string;
  isPremium?: boolean;
}>).map((m) => ({
  id: m.id,
  name: m.name,
  speedBonus: m.speedBonus,
  description: m.description,
  isPremium: m.isPremium,
}));

export const AVAILABLE_MOUNTS: MountOption[] = [
  ...PARSED_MOUNTS,
  { id: 'none', name: 'Sem Montaria', speedBonus: 0, description: 'Caminhe normalmente a pé pelo mapa.' },
];

// Backwards compatibility for tests that import TIBIA_PALETTE
export const TIBIA_PALETTE = TIBIA_133_COLORS.slice(0, 16).map((color, id) => ({
  id,
  color,
  label: `Cor ${id}`,
}));

const DIRECTIONS = ['south', 'east', 'north', 'west'] as const;
type Direction = (typeof DIRECTIONS)[number];

interface Props {
  open: boolean;
  characters: CharacterState[];
  activeCharacterId: string;
  onClose(): void;
  onSave(
    characterId: string,
    customization: {
      outfit: string;
      mount: string;
      mountActive: boolean;
      addons: number;
      outfitColors?: { head: number; primary: number; secondary: number; detail: number };
    }
  ): void;
}

export function OutfitModal({ open, characters, activeCharacterId, onClose, onSave }: Props) {
  const [selectedCharId, setSelectedCharId] = useState(activeCharacterId);
  const [topTab, setTopTab] = useState<'character' | 'outfit'>('outfit');
  const [selectedTab, setSelectedTab] = useState<'outfits' | 'mounts'>('outfits');
  const [selectedOutfit, setSelectedOutfit] = useState('Knight');
  const [selectedMount, setSelectedMount] = useState('donkey');
  const [mountActive, setMountActive] = useState(false);
  const [addon1, setAddon1] = useState(false);
  const [addon2, setAddon2] = useState(false);
  const [directionIdx, setDirectionIdx] = useState(0);
  const [colorPart, setColorPart] = useState<'head' | 'primary' | 'secondary' | 'detail'>('head');
  const [colors, setColors] = useState<OutfitColors>({ head: 0, primary: 86, secondary: 114, detail: 76 });
  const [filterAcquired, setFilterAcquired] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastSyncedCharRef = useRef<string | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const charGender: 'male' | 'female' = activeChar?.gender === 'female' ? 'female' : 'male';

  // Sync state ONLY when modal newly opens or when user explicitly changes selected character
  useEffect(() => {
    if (!open) {
      lastSyncedCharRef.current = null;
      prevOpenRef.current = false;
      return;
    }

    const isNewlyOpened = !prevOpenRef.current;
    prevOpenRef.current = true;

    if (isNewlyOpened || lastSyncedCharRef.current !== selectedCharId) {
      lastSyncedCharRef.current = selectedCharId;
      const char = characters.find((c) => c.id === selectedCharId) || characters[0];
      if (char) {
        setSelectedOutfit(char.outfit || char.baseVocation || 'Knight');
        setSelectedMount(char.mount || 'donkey');
        // Authentic requirement: Character opens ON FOOT by default unless saved mountActive is explicitly true
        setMountActive(char.mountActive !== undefined ? Boolean(char.mountActive) : false);
        const addons = char.addons || 0;
        setAddon1((addons & 1) !== 0);
        setAddon2((addons & 2) !== 0);
        if (char.outfitColors) setColors(char.outfitColors);
      }
    }
  }, [selectedCharId, open]);

  const isMounted = mountActive && selectedMount !== 'none';
  const currentDir = DIRECTIONS[directionIdx];

  // Live recolor preview on canvas whenever outfit, direction or colors change
  useEffect(() => {
    if (!open) return;
    if (isMounted) return;

    if (previewCanvasRef.current) {
      renderRecoloredOutfit(
        previewCanvasRef.current,
        selectedOutfit,
        charGender,
        currentDir,
        0,
        colors
      );
    }
  }, [open, selectedOutfit, charGender, currentDir, colors, isMounted]);

  if (!open) return null;

  const charIdx = characters.findIndex((c) => c.id === selectedCharId);

  const prevPartyMember = () => {
    const nextIdx = (charIdx - 1 + characters.length) % characters.length;
    setSelectedCharId(characters[nextIdx].id);
  };

  const nextPartyMember = () => {
    const nextIdx = (charIdx + 1) % characters.length;
    setSelectedCharId(characters[nextIdx].id);
  };

  const rotateNext = () => {
    setDirectionIdx((prev) => (prev + 1) % 4);
  };

  // Resolve thumbnail for outfit cards
  const getOutfitThumbUrl = (outfitId: string): string => {
    const idLower = normalizeOutfitId(outfitId);
    return `/generated/outfit-thumbs/${idLower}.png`;
  };

  // Resolve thumbnail for mount cards
  const getMountThumbUrl = (mountId: string): string => {
    if (mountId === 'donkey') {
      return '/generated/mounts/donkey_rider_south.png';
    }
    return `/generated/mounts/${mountId}.png`;
  };

  const handleSave = () => {
    let addonsVal = 0;
    if (addon1) addonsVal |= 1;
    if (addon2) addonsVal |= 2;
    onSave(selectedCharId, {
      outfit: selectedOutfit,
      mount: selectedMount,
      mountActive: mountActive && selectedMount !== 'none',
      addons: addonsVal,
      outfitColors: colors,
    });
    preloadOutfitAllFrames(selectedOutfit, activeChar.gender || 'male', colors).catch(() => {});
    onClose();
  };

  const currentColorIdx = colors[colorPart] ?? 0;
  const activePartHex = TIBIA_133_COLORS[currentColorIdx] || '#ffffff';

  const outfitsToDisplay = filterAcquired
    ? AVAILABLE_OUTFITS.filter((o) => !o.isPremium || o.id === activeChar.outfit)
    : AVAILABLE_OUTFITS;

  return (
    <div
      className="modal-backdrop tibia-outfit-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="tibia-outfit-window" role="dialog" aria-modal="true" aria-label="Aparência do Personagem">
        {/* Title Bar */}
        <div className="tibia-window-titlebar">
          <div className="tibia-titlebar-left">
            <span className="tibia-titlebar-title">Customizar Aparência</span>
            <button
              type="button"
              className="tibia-titlebar-nav-btn"
              onClick={prevPartyMember}
              title="Personagem anterior da party"
            >
              ◀
            </button>
            <span className="tibia-titlebar-hint">{activeChar.name}</span>
            <button
              type="button"
              className="tibia-titlebar-nav-btn"
              onClick={nextPartyMember}
              title="Próximo personagem da party"
            >
              ▶
            </button>
          </div>
          <button
            type="button"
            className="tibia-window-close-btn"
            onClick={onClose}
            aria-label="Fechar"
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Top Nav: PERSONAGEM / OUTFIT */}
        <div className="tibia-top-nav-tabs">
          <button
            type="button"
            className={`tibia-top-nav-tab ${topTab === 'character' ? 'active' : ''}`}
            onClick={() => setTopTab('character')}
          >
            Personagem
          </button>
          <button
            type="button"
            className={`tibia-top-nav-tab ${topTab === 'outfit' ? 'active' : ''}`}
            onClick={() => setTopTab('outfit')}
          >
            Outfit
          </button>
        </div>

        {/* Main Body: 2 Columns */}
        <div className="tibia-outfit-content">
          {/* Left Column */}
          <div className="tibia-outfit-left-col">
            <div className="tibia-beveled-check-box">
              <label className="tibia-check-label">
                <input
                  type="checkbox"
                  checked={addon1}
                  onChange={(e) => setAddon1(e.target.checked)}
                  className="tibia-custom-checkbox"
                />
                <span className="tibia-check-text">Addon 1</span>
              </label>
            </div>

            <div className="tibia-beveled-check-box">
              <label className="tibia-check-label">
                <input
                  type="checkbox"
                  checked={addon2}
                  onChange={(e) => setAddon2(e.target.checked)}
                  className="tibia-custom-checkbox"
                />
                <span className="tibia-check-text">Addon 2</span>
              </label>
            </div>

            <div className="tibia-beveled-check-box">
              <label className="tibia-check-label">
                <input
                  type="checkbox"
                  checked={mountActive && selectedMount !== 'none'}
                  disabled={selectedMount === 'none'}
                  onChange={(e) => setMountActive(e.target.checked)}
                  className="tibia-custom-checkbox"
                />
                <span className="tibia-check-text">
                  {AVAILABLE_MOUNTS.find((m) => m.id === selectedMount)?.name || 'Sem Montaria'}
                </span>
              </label>
            </div>

            <div className="tibia-preview-box">
              <div className="tibia-preview-inner">
                {isMounted ? (
                  <img
                    src={getMountThumbUrl(selectedMount)}
                    alt="Mounted"
                    className="tibia-preview-sprite mounted"
                    style={{
                      imageRendering: 'pixelated',
                      transform: currentDir === 'west' || currentDir === 'north' ? 'scaleX(-1)' : undefined,
                    }}
                  />
                ) : (
                  <canvas
                    ref={previewCanvasRef}
                    width={64}
                    height={64}
                    className="tibia-preview-sprite on-foot"
                    style={{
                      imageRendering: 'pixelated',
                      width: '64px',
                      height: '64px',
                    }}
                  />
                )}
              </div>
              <button
                type="button"
                className="tibia-rotate-corner-btn"
                onClick={rotateNext}
                title="Girar Personagem (⟳)"
              >
                ⟳
              </button>
            </div>

            <div className="tibia-body-part-tabs">
              {(
                [
                  { id: 'head', label: 'Cabeça' },
                  { id: 'primary', label: 'Corpo' },
                  { id: 'secondary', label: 'Pernas' },
                  { id: 'detail', label: 'Pés' },
                ] as const
              ).map((part) => (
                <button
                  key={part.id}
                  type="button"
                  className={`tibia-body-part-tab ${colorPart === part.id ? 'active' : ''}`}
                  onClick={() => setColorPart(part.id)}
                >
                  {part.label}
                </button>
              ))}
            </div>

            <div className="tibia-palette-container">
              <div
                className="tibia-palette-active-indicator"
                style={{ backgroundColor: activePartHex }}
                title={`Cor Ativa: ${activePartHex}`}
              />
              <div className="tibia-palette-matrix-19x7">
                {TIBIA_133_COLORS.map((hex, idx) => {
                  const isSelected = currentColorIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`tibia-color-swatch-19x7 ${isSelected ? 'active' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColors((prev) => ({ ...prev, [colorPart]: idx }))}
                      title={`Cor ${idx}: ${hex}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="tibia-outfit-right-col">
            <div className="tibia-subnav-tabs">
              <button
                type="button"
                className={`tibia-subnav-tab ${selectedTab === 'outfits' ? 'active' : ''}`}
                onClick={() => setSelectedTab('outfits')}
              >
                Outfits
              </button>
              <button
                type="button"
                className={`tibia-subnav-tab ${selectedTab === 'mounts' ? 'active' : ''}`}
                onClick={() => setSelectedTab('mounts')}
              >
                Montarias
              </button>
            </div>

            <div className="tibia-filter-bar">
              <label className="tibia-filter-check-label">
                <input
                  type="checkbox"
                  checked={filterAcquired}
                  onChange={(e) => setFilterAcquired(e.target.checked)}
                  className="tibia-custom-checkbox"
                />
                <span>Mostrar só os adquiridos</span>
              </label>
            </div>

            <div className="tibia-cards-scroll-grid">
              {selectedTab === 'outfits' ? (
                outfitsToDisplay.map((outfit) => {
                  const isSelected = selectedOutfit === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`tibia-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedOutfit(outfit.id);
                        if (mountActive) setMountActive(false);
                      }}
                    >
                      <div className="tibia-card-sprite-wrap">
                        <img
                          src={getOutfitThumbUrl(outfit.id)}
                          alt={outfit.name}
                          className="tibia-card-sprite"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="tibia-card-name">{outfit.name}</span>
                      {outfit.isCustom ? (
                        <span className="tibia-card-badge-custom">Novo</span>
                      ) : outfit.isPremium ? (
                        <span className="tibia-card-badge-premium">Premium</span>
                      ) : (
                        <span className="tibia-card-badge-free">Básico</span>
                      )}
                    </div>
                  );
                })
              ) : (
                AVAILABLE_MOUNTS.map((mount) => {
                  const isSelected = selectedMount === mount.id;
                  return (
                    <div
                      key={mount.id}
                      className={`tibia-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedMount(mount.id);
                        if (mount.id !== 'none') setMountActive(true);
                        else setMountActive(false);
                      }}
                    >
                      <div className="tibia-card-sprite-wrap">
                        <img
                          src={getMountThumbUrl(mount.id)}
                          alt={mount.name}
                          className="tibia-card-sprite mount-sprite"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="tibia-card-name">{mount.name}</span>
                      {mount.id !== 'none' ? (
                        <span className="tibia-card-badge-premium">Premium</span>
                      ) : (
                        <span className="tibia-card-badge-free">A pé</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Window Footer */}
        <div className="tibia-window-footer">
          <button type="button" className="tibia-footer-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="tibia-footer-btn-save" onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
