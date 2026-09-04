import React, { useState, useEffect } from 'react';
import visualAssetsJson from '@/content/generated/tibia860-assets.json';
import type { Tibia860AssetManifest } from '@/packages/tibia860-assets/src/types';
import type { CharacterState } from '@/packages/domain/src/types';

const visualAssets = visualAssetsJson as unknown as Tibia860AssetManifest;

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

export const AVAILABLE_MOUNTS: MountOption[] = [
  { id: 'donkey', name: 'Donkey', speedBonus: 20, description: 'Burrinho leal e teimoso para longas travessias.', isPremium: true },
  { id: 'war-horse', name: 'War Horse', speedBonus: 20, description: 'Cavalo de batalha robusto com barda de aço.', isPremium: true },
  { id: 'midnight-panther', name: 'Midnight Panther', speedBonus: 20, description: 'Pantera lendária de Tiquanda com passos silenciosos.', isPremium: true },
  { id: 'widow-queen', name: 'Widow Queen', speedBonus: 20, description: 'Aranha gigante domesticada das profundezas de Venore.', isPremium: true },
  { id: 'shadow-draptor', name: 'Shadow Draptor', speedBonus: 20, description: 'Réptil veloz das estepes corrompidas de Zao.', isPremium: true },
  { id: 'ursagrodon', name: 'Ursagrodon', speedBonus: 20, description: 'Fera colossal de gelo blindada das ilhas de Svargrond.', isPremium: true },
  { id: 'crystal-wolf', name: 'Crystal Wolf', speedBonus: 20, description: 'Lobo espiritual infundido com cristais incandescentes.', isPremium: true },
  { id: 'blazebringer', name: 'Blazebringer', speedBonus: 20, description: 'Montaria ígnea com crina em chamas sagradas.', isPremium: true },
  { id: 'none', name: 'Sem Montaria', speedBonus: 0, description: 'Caminhe normalmente a pé pelo mapa.' },
];

/**
 * Exact 19 columns x 7 rows (133 colors) official Tibia outfit palette matrix
 */
export const TIBIA_133_COLORS: string[] = [
  // Row 0: White and light pastel spectrum
  '#ffffff', '#ffd5bf', '#ffeabf', '#ffffbf', '#eaffbf', '#d4ffbf', '#bfffbf', '#bfffd5', '#bfffea', '#bfffff', '#bfeaff', '#bfd4ff', '#bfbfff', '#d4bfff', '#eabfff', '#ffbfff', '#ffbfea', '#ffbfd5', '#ffbfbf',
  // Row 1: Light gray and muted earth
  '#dbdbdb', '#bf9f8f', '#bfaf8f', '#bfbf8f', '#afbf8f', '#9fbf8f', '#8fbf8f', '#8fbf9f', '#8fbfaf', '#8fbfbf', '#8fafbf', '#8f9fbf', '#8f8fbf', '#9f8fbf', '#af8fbf', '#bf8fbf', '#bf8faf', '#bf8f9f', '#bf8f8f',
  // Row 2: Medium gray and medium muted spectrum
  '#b6b6b6', '#bf8060', '#bf9f60', '#bfbf60', '#9fbf60', '#80bf60', '#60bf60', '#60bf80', '#60bf9f', '#60bfbf', '#609fbf', '#607fbf', '#6060bf', '#7f60bf', '#9f60bf', '#bf60bf', '#bf609f', '#bf6080', '#bf6060',
  // Row 3: Dark gray and deep muted spectrum
  '#929292', '#bf6a40', '#bf9540', '#bfbf40', '#95bf40', '#6abf40', '#40bf40', '#40bf6a', '#40bf95', '#40bfbf', '#4095bf', '#406abf', '#4040bf', '#6a40bf', '#9540bf', '#bf40bf', '#bf4095', '#bf406a', '#bf4040',
  // Row 4: Charcoal and pure vivid spectrum
  '#6d6d6d', '#ff5500', '#ffaa00', '#ffff00', '#aaff00', '#55ff00', '#00ff00', '#00ff55', '#00ffaa', '#00ffff', '#00aaff', '#0055ff', '#0000ff', '#5500ff', '#aa00ff', '#ff00ff', '#ff00aa', '#ff0055', '#ff0000',
  // Row 5: Deep charcoal and dark saturated spectrum
  '#494949', '#bf4000', '#bf8000', '#bfbf00', '#80bf00', '#40bf00', '#00bf00', '#00bf40', '#00bf7f', '#00bfbf', '#007fbf', '#0040bf', '#0000bf', '#4000bf', '#8000bf', '#bf00bf', '#bf0080', '#bf0040', '#bf0000',
  // Row 6: Near black and deep shadow shades
  '#242424', '#802b00', '#805500', '#808000', '#558000', '#2a8000', '#008000', '#00802b', '#008055', '#008080', '#005580', '#002a80', '#000080', '#2a0080', '#550080', '#800080', '#800055', '#80002b', '#800000',
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
  const [mountActive, setMountActive] = useState(true);
  const [addon1, setAddon1] = useState(false);
  const [addon2, setAddon2] = useState(false);
  const [directionIdx, setDirectionIdx] = useState(0);
  const [colorPart, setColorPart] = useState<'head' | 'primary' | 'secondary' | 'detail'>('head');
  const [colors, setColors] = useState({ head: 0, primary: 86, secondary: 114, detail: 76 });
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [filterAcquired, setFilterAcquired] = useState(false);

  // Sync state when active character changes
  useEffect(() => {
    if (!open) return;
    const char = characters.find((c) => c.id === selectedCharId) || characters[0];
    if (char) {
      setSelectedOutfit(char.outfit || char.baseVocation || 'Knight');
      setSelectedMount(char.mount || 'donkey');
      setMountActive(char.mountActive !== undefined ? Boolean(char.mountActive) : true);
      const addons = char.addons || 0;
      setAddon1((addons & 1) !== 0);
      setAddon2((addons & 2) !== 0);
      if (char.outfitColors) setColors(char.outfitColors);
    }
  }, [selectedCharId, open, characters]);

  if (!open) return null;

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
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

  const currentDir = DIRECTIONS[directionIdx];

  // Resolve thumbnail for outfit cards (matching all 14 local extracted sprites)
  const getOutfitThumbUrl = (outfitId: string): string => {
    const idLower = outfitId.toLowerCase();
    if (['citizen', 'hunter', 'mage', 'knight', 'noble', 'summoner', 'warrior', 'barbarian', 'druid', 'sorcerer', 'paladin', 'sire', 'assassin', 'pirate'].includes(idLower)) {
      return `/generated/outfit-thumbs/${idLower}.png`;
    }
    if (idLower === 'oriental') return '/generated/outfit-thumbs/sorcerer.png';
    if (idLower === 'beggar') return '/generated/outfit-thumbs/citizen.png';
    return '/generated/outfit-thumbs/knight.png';
  };

  // Resolve thumbnail for mount cards
  const getMountThumbUrl = (mountId: string): string => {
    if (mountId === 'donkey') {
      return '/generated/mounts/donkey_rider_south.png';
    }
    return '/generated/outfit-thumbs/knight.png';
  };

  // Resolve large preview image URL
  const isMountedDonkey = mountActive && (selectedMount === 'donkey' || selectedMount === 'Donkey');

  const normKey = selectedOutfit.includes('Sire')
    ? 'Sire'
    : selectedOutfit.includes('Sorcerer') || selectedOutfit.includes('Mage')
    ? 'Sorcerer'
    : selectedOutfit.includes('Druid')
    ? 'Druid'
    : selectedOutfit.includes('Paladin') || selectedOutfit.includes('Hunter')
    ? 'Paladin'
    : 'Knight';

  const outfitAsset = visualAssets.outfits[normKey] || visualAssets.outfits['Knight'];
  const dirFrames = outfitAsset?.frames.filter((f) => f.direction === currentDir) ?? [];
  const candidateFrame = dirFrames[0] || outfitAsset?.frames[0];
  const onFootPreviewUrl = candidateFrame?.publicUrl ?? getOutfitThumbUrl(selectedOutfit);

  const previewSpriteUrl = isMountedDonkey ? '/generated/mounts/donkey_rider_south.png' : onFootPreviewUrl;

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
    onClose();
  };

  // Currently active color index and hex
  const currentColorIdx = colors[colorPart] ?? 0;
  const activePartHex = TIBIA_133_COLORS[currentColorIdx] || '#ffffff';

  // Filter outfits if checkbox is checked
  const outfitsToDisplay = filterAcquired
    ? AVAILABLE_OUTFITS.filter((o) => !o.isPremium || o.id === activeChar.outfit)
    : AVAILABLE_OUTFITS;

  return (
    <div
      className="tibia-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="tibia-outfit-window"
        role="dialog"
        aria-modal="true"
        aria-label="Personalização de Outfit e Montaria"
      >
        {/* Title Bar */}
        <div className="tibia-window-titlebar">
          <div className="tibia-titlebar-left">
            {characters.length > 1 && (
              <button
                type="button"
                className="tibia-titlebar-nav-btn"
                onClick={prevPartyMember}
                title="Personagem Anterior"
              >
                ◀
              </button>
            )}
            <span className="tibia-titlebar-title">{activeChar.name}</span>
            {characters.length > 1 && (
              <button
                type="button"
                className="tibia-titlebar-nav-btn"
                onClick={nextPartyMember}
                title="Próximo Personagem"
              >
                ▶
              </button>
            )}
            {characters.length > 1 && (
              <span className="tibia-titlebar-hint">
                ({charIdx + 1}/{characters.length})
              </span>
            )}
          </div>
          <button
            type="button"
            className="tibia-window-close-btn"
            onClick={onClose}
            title="Fechar Janela"
          >
            ✕
          </button>
        </div>

        {/* Top Navigation Tabs: PERSONAGEM / OUTFIT */}
        <div className="tibia-top-nav-tabs">
          <button
            type="button"
            className={`tibia-top-nav-tab ${topTab === 'character' ? 'active' : ''}`}
            onClick={() => setTopTab('character')}
          >
            PERSONAGEM
          </button>
          <button
            type="button"
            className={`tibia-top-nav-tab ${topTab === 'outfit' ? 'active' : ''}`}
            onClick={() => setTopTab('outfit')}
          >
            OUTFIT
          </button>
        </div>

        {/* Window Content Body */}
        <div className="tibia-outfit-content">
          {/* Left Column */}
          <div className="tibia-outfit-left-col">
            {/* Addon 1 Box */}
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

            {/* Addon 2 Box */}
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

            {/* Mount Toggle Box */}
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

            {/* Large Preview Box */}
            <div className="tibia-preview-box">
              <div className="tibia-preview-inner">
                {previewSpriteUrl ? (
                  <img
                    src={previewSpriteUrl}
                    alt={selectedOutfit}
                    className={`tibia-preview-sprite ${isMountedDonkey ? 'mounted' : 'on-foot'}`}
                    style={{
                      imageRendering: 'pixelated',
                      transform: isMountedDonkey && (currentDir === 'west' || currentDir === 'north') ? 'scaleX(-1)' : undefined,
                    }}
                  />
                ) : (
                  <div className="tibia-preview-empty">Sem sprite</div>
                )}
              </div>
              {/* Rotate Button in bottom-right corner */}
              <button
                type="button"
                className="tibia-rotate-corner-btn"
                onClick={rotateNext}
                title="Girar Personagem (⟳)"
              >
                ⟳
              </button>
            </div>

            {/* 4 Body Part Tabs */}
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

            {/* 19x7 Color Matrix with Active Indicator Swatch */}
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
                      type="button"
                      key={idx}
                      className={`tibia-palette-cell ${isSelected ? 'active' : ''}`}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColors((prev) => ({ ...prev, [colorPart]: idx }))}
                      title={`Cor #${idx} (${hex})`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="tibia-outfit-right-col">
            {/* Sub-tabs: Outfits vs Montarias */}
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

            {/* Filter Bar: Checkbox + Male/Female Radio */}
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

              <div className="tibia-gender-radio-group">
                <label className="tibia-gender-label">
                  <input
                    type="radio"
                    name="tibia-gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    className="tibia-custom-radio"
                  />
                  <span>Masculino</span>
                </label>
                <label className="tibia-gender-label">
                  <input
                    type="radio"
                    name="tibia-gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    className="tibia-custom-radio"
                  />
                  <span>Feminino</span>
                </label>
              </div>
            </div>

            {/* 4-Column Card Grid */}
            <div className="tibia-cards-scroll-grid">
              {selectedTab === 'outfits' ? (
                outfitsToDisplay.map((outfit) => {
                  const isSelected = selectedOutfit === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      className={`tibia-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedOutfit(outfit.id)}
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
