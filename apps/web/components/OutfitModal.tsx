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
}

export interface MountOption {
  id: string;
  name: string;
  speedBonus: number;
  description: string;
}

export const AVAILABLE_OUTFITS: OutfitOption[] = [
  { id: 'Sire', name: 'Sire', description: 'Cultista arcano com manto sombrio e máscara esquelética.', isCustom: true },
  { id: 'Knight', name: 'Knight', description: 'Traje de combate pesado de cavaleiro clássico.', vocationHint: 'Knight' },
  { id: 'Paladin', name: 'Paladin', description: 'Vestimenta de caçador ágil com túnica e botas leves.', vocationHint: 'Paladin' },
  { id: 'Sorcerer', name: 'Sorcerer', description: 'Roupagem mística de feiticeiro com símbolos arcanos.', vocationHint: 'Sorcerer' },
  { id: 'Druid', name: 'Druid', description: 'Manto elemental abençoado pelas forças da natureza.', vocationHint: 'Druid' },
  { id: 'Citizen', name: 'Citizen', description: 'Vestimenta padrão dos habitantes de Thais e Carlin.' },
  { id: 'Hunter', name: 'Hunter', description: 'Traje de sobrevivência e rastreamento florestal.' },
  { id: 'Mage', name: 'Mage', description: 'Toga cerimonial tradicional dos mestres da magia.' },
  { id: 'Warrior', name: 'Warrior', description: 'Armadura tradicional com ombreiras e cinto rústico.' },
];

export const AVAILABLE_MOUNTS: MountOption[] = [
  { id: 'none', name: 'A pé (Sem Montaria)', speedBonus: 0, description: 'Caminhe normalmente a pé pelo mapa.' },
  { id: 'war-horse', name: 'War Horse', speedBonus: 20, description: 'Cavalo de batalha robusto com barda de aço.' },
  { id: 'midnight-panther', name: 'Midnight Panther', speedBonus: 20, description: 'Pantera lendária de Tiquanda com passos silenciosos.' },
  { id: 'widow-queen', name: 'Widow Queen', speedBonus: 20, description: 'Aranha gigante domesticada das profundezas de Venore.' },
  { id: 'shadow-draptor', name: 'Shadow Draptor', speedBonus: 20, description: 'Réptil veloz das estepes corrompidas de Zao.' },
  { id: 'ursagrodon', name: 'Ursagrodon', speedBonus: 20, description: 'Fera colossal de gelo blindada das ilhas de Svargrond.' },
  { id: 'crystal-wolf', name: 'Crystal Wolf', speedBonus: 20, description: 'Lobo espiritual infundido com cristais incandescentes.' },
  { id: 'blazebringer', name: 'Blazebringer', speedBonus: 20, description: 'Montaria ígnea com crina em chamas sagradas.' },
  { id: 'donkey', name: 'Donkey', speedBonus: 20, description: 'Burrinho leal e teimoso para longas travessias.' },
];

export const TIBIA_PALETTE = [
  { id: 0, color: '#f3f3f3', label: 'Branco Neve' },
  { id: 1, color: '#c4c4c4', label: 'Cinza Claro' },
  { id: 2, color: '#7a7a7a', label: 'Chumbo' },
  { id: 3, color: '#313131', label: 'Carvão' },
  { id: 4, color: '#b82a2a', label: 'Rubi' },
  { id: 5, color: '#d97724', label: 'Âmbar' },
  { id: 6, color: '#d9b324', label: 'Dourado' },
  { id: 7, color: '#358a3f', label: 'Esmeralda' },
  { id: 8, color: '#277085', label: 'Ciano Profundo' },
  { id: 9, color: '#2b4d99', label: 'Azul Real' },
  { id: 10, color: '#68339c', label: 'Ametista' },
  { id: 11, color: '#9c3384', label: 'Magenta' },
  { id: 12, color: '#734d31', label: 'Couro Rústico' },
  { id: 13, color: '#4a2e1b', label: 'Marrom Escuro' },
  { id: 14, color: '#97825d', label: 'Areia' },
  { id: 15, color: '#161922', label: 'Abissal' },
];

const DIRECTIONS = ['south', 'east', 'north', 'west'] as const;
type Direction = (typeof DIRECTIONS)[number];

const DIRECTION_LABELS: Record<Direction, string> = {
  south: 'Frente (Sul)',
  east: 'Direita (Leste)',
  north: 'Costas (Norte)',
  west: 'Esquerda (Oeste)',
};

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
  const [selectedTab, setSelectedTab] = useState<'outfits' | 'mounts'>('outfits');
  const [selectedOutfit, setSelectedOutfit] = useState('Knight');
  const [selectedMount, setSelectedMount] = useState('none');
  const [mountActive, setMountActive] = useState(false);
  const [addon1, setAddon1] = useState(false);
  const [addon2, setAddon2] = useState(false);
  const [directionIdx, setDirectionIdx] = useState(0);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [colorPart, setColorPart] = useState<'head' | 'primary' | 'secondary' | 'detail'>('primary');
  const [colors, setColors] = useState({ head: 0, primary: 10, secondary: 3, detail: 6 });

  // Sync state when active character changes
  useEffect(() => {
    if (!open) return;
    const char = characters.find((c) => c.id === selectedCharId) || characters[0];
    if (char) {
      setSelectedOutfit(char.outfit || char.baseVocation || 'Knight');
      setSelectedMount(char.mount || 'none');
      setMountActive(Boolean(char.mountActive));
      const addons = char.addons || 0;
      setAddon1((addons & 1) !== 0);
      setAddon2((addons & 2) !== 0);
      if (char.outfitColors) setColors(char.outfitColors);
    }
  }, [selectedCharId, open, characters]);

  // Animated walk/breathing cycle in the preview box
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setPreviewFrame((prev) => (prev + 1) % 3);
    }, 450);
    return () => clearInterval(interval);
  }, [open]);

  if (!open) return null;

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const currentDir = DIRECTIONS[directionIdx];

  // Resolve preview image URL
  const normKey = selectedOutfit.includes('Sire')
    ? 'Sire'
    : selectedOutfit.includes('Sorcerer') || selectedOutfit.includes('Mage')
    ? 'Sorcerer'
    : selectedOutfit.includes('Druid')
    ? 'Druid'
    : selectedOutfit.includes('Paladin') || selectedOutfit.includes('Hunter')
    ? 'Paladin'
    : selectedOutfit.includes('Knight') || selectedOutfit.includes('Citizen') || selectedOutfit.includes('Warrior')
    ? 'Knight'
    : selectedOutfit;

  const outfitAsset = visualAssets.outfits[normKey] || visualAssets.outfits['Knight'];
  const dirFrames = outfitAsset?.frames.filter((f) => f.direction === currentDir) ?? [];
  const candidates = dirFrames.length > 0 ? dirFrames : outfitAsset?.frames.filter((f) => f.direction === 'south') ?? [];
  const previewImgUrl = (candidates[previewFrame] || candidates[0] || outfitAsset?.frames[0])?.publicUrl ?? '';

  const rotateLeft = () => setDirectionIdx((prev) => (prev + 3) % 4);
  const rotateRight = () => setDirectionIdx((prev) => (prev + 1) % 4);

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

  return (
    <div className="modal-backdrop outfit-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="outfit-modal-card" role="dialog" aria-modal="true" aria-label="Select Outfit">
        {/* Modal Header */}
        <div className="outfit-modal-header">
          <div className="outfit-header-title-row">
            <span className="outfit-header-icon">👑</span>
            <h2 className="outfit-modal-title">SELECT OUTFIT</h2>
            <button type="button" className="outfit-close-btn" onClick={onClose} title="Fechar">✕</button>
          </div>
          <p className="outfit-modal-subtitle">
            Personalize a aparência, vestimentas e montarias dos heróis da sua party.
          </p>

          {/* Party Member Switcher Tabs */}
          <div className="outfit-character-tabs">
            {characters.map((char) => {
              const isSelected = char.id === selectedCharId;
              const charOutfit = char.outfit || char.baseVocation || 'Knight';
              return (
                <button
                  type="button"
                  key={char.id}
                  className={`outfit-char-tab ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedCharId(char.id)}
                >
                  <span className="char-tab-name">{char.name}</span>
                  <span className="char-tab-voc">Lv. {char.level} · {char.vocation}</span>
                  {isSelected && <span className="char-tab-badge">Selecionado</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body: Left List + Right Preview */}
        <div className="outfit-modal-body">
          {/* Left Column: Category Tabs & List */}
          <div className="outfit-list-column">
            <div className="outfit-category-tabs">
              <button
                type="button"
                className={`outfit-cat-btn ${selectedTab === 'outfits' ? 'active' : ''}`}
                onClick={() => setSelectedTab('outfits')}
              >
                🥋 Outfits ({AVAILABLE_OUTFITS.length})
              </button>
              <button
                type="button"
                className={`outfit-cat-btn ${selectedTab === 'mounts' ? 'active' : ''}`}
                onClick={() => setSelectedTab('mounts')}
              >
                🐎 Montarias ({AVAILABLE_MOUNTS.length})
              </button>
            </div>

            <div className="outfit-scroll-list">
              {selectedTab === 'outfits' ? (
                AVAILABLE_OUTFITS.map((item) => {
                  const isCur = selectedOutfit === item.id;
                  // Thumbnail preview for this outfit
                  const thumbKey = item.id.includes('Sire') ? 'Sire' : item.vocationHint || 'Knight';
                  const thumbUrl = visualAssets.outfits[thumbKey]?.frames.find((f) => f.direction === 'south')?.publicUrl;

                  return (
                    <div
                      key={item.id}
                      className={`outfit-list-item ${isCur ? 'selected' : ''}`}
                      onClick={() => setSelectedOutfit(item.id)}
                    >
                      <div className="outfit-item-thumb">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={item.name} className="outfit-thumb-img" />
                        ) : (
                          <span className="outfit-thumb-placeholder">🥋</span>
                        )}
                      </div>
                      <div className="outfit-item-info">
                        <div className="outfit-item-title-row">
                          <span className="outfit-item-name">{item.name}</span>
                          {item.isCustom && <span className="outfit-badge-custom">NOVO</span>}
                          {isCur && <span className="outfit-badge-check">✓ Ativo</span>}
                        </div>
                        <span className="outfit-item-desc">{item.description}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                AVAILABLE_MOUNTS.map((mount) => {
                  const isCur = selectedMount === mount.id;
                  return (
                    <div
                      key={mount.id}
                      className={`outfit-list-item ${isCur ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedMount(mount.id);
                        if (mount.id !== 'none') setMountActive(true);
                        else setMountActive(false);
                      }}
                    >
                      <div className="outfit-item-thumb mount-thumb">
                        <span className="mount-thumb-icon">{mount.id === 'none' ? '🚶' : '🐎'}</span>
                      </div>
                      <div className="outfit-item-info">
                        <div className="outfit-item-title-row">
                          <span className="outfit-item-name">{mount.name}</span>
                          {mount.speedBonus > 0 && (
                            <span className="mount-badge-speed">+{mount.speedBonus} Vel</span>
                          )}
                          {isCur && <span className="outfit-badge-check">✓ Selecionada</span>}
                        </div>
                        <span className="outfit-item-desc">{mount.description}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Live 360° Preview & Customization */}
          <div className="outfit-preview-column">
            <div className="outfit-preview-card">
              <div className="outfit-preview-header">
                <span className="preview-label">VISUALIZAÇÃO EM TEMPO REAL</span>
                <span className="preview-char-tag">{activeChar.name}</span>
              </div>

              {/* 3D-like Pedestal Stage */}
              <div className="outfit-stage-box">
                <div className="stage-pedestal">
                  <div className="stage-shadow" />
                  {previewImgUrl ? (
                    <img
                      src={previewImgUrl}
                      alt={selectedOutfit}
                      className="stage-sprite-img"
                      style={{
                        imageRendering: 'pixelated',
                        transform: 'scale(2.2)',
                        transformOrigin: 'bottom center',
                      }}
                    />
                  ) : (
                    <div className="stage-empty">Sem visualização</div>
                  )}
                  {mountActive && selectedMount !== 'none' && (
                    <div className="stage-mount-indicator" title={selectedMount}>
                      🐎 {AVAILABLE_MOUNTS.find((m) => m.id === selectedMount)?.name}
                    </div>
                  )}
                </div>

                {/* Direction Navigation Buttons */}
                <div className="stage-direction-nav">
                  <button type="button" className="stage-rot-btn" onClick={rotateLeft} title="Girar à Esquerda">◀</button>
                  <span className="stage-dir-name">{DIRECTION_LABELS[currentDir]}</span>
                  <button type="button" className="stage-rot-btn" onClick={rotateRight} title="Girar à Direita">▶</button>
                </div>
              </div>

              {/* Addons & Mount Toggle */}
              <div className="outfit-addons-group">
                <span className="addons-title">ACESSÓRIOS & MONTARIA:</span>
                <div className="addons-checkboxes-row">
                  <label className="addon-check-label">
                    <input
                      type="checkbox"
                      checked={addon1}
                      onChange={(e) => setAddon1(e.target.checked)}
                      className="addon-checkbox"
                    />
                    <span>Addon 1 (Capa / Arma)</span>
                  </label>
                  <label className="addon-check-label">
                    <input
                      type="checkbox"
                      checked={addon2}
                      onChange={(e) => setAddon2(e.target.checked)}
                      className="addon-checkbox"
                    />
                    <span>Addon 2 (Elmo / Ombreira)</span>
                  </label>
                  <label className="addon-check-label">
                    <input
                      type="checkbox"
                      checked={mountActive && selectedMount !== 'none'}
                      disabled={selectedMount === 'none'}
                      onChange={(e) => setMountActive(e.target.checked)}
                      className="addon-checkbox"
                    />
                    <span>Montado (+20 Speed)</span>
                  </label>
                </div>
              </div>

              {/* Color Customization Palette */}
              <div className="outfit-colors-group">
                <div className="colors-part-tabs">
                  {(['head', 'primary', 'secondary', 'detail'] as const).map((part) => (
                    <button
                      key={part}
                      type="button"
                      className={`color-part-btn ${colorPart === part ? 'active' : ''}`}
                      onClick={() => setColorPart(part)}
                    >
                      {part === 'head' ? 'Cabelo' : part === 'primary' ? 'Primária' : part === 'secondary' ? 'Secundária' : 'Detalhe'}
                    </button>
                  ))}
                </div>

                <div className="colors-swatches-grid">
                  {TIBIA_PALETTE.map((swatch) => {
                    const isSelected = colors[colorPart] === swatch.id;
                    return (
                      <button
                        type="button"
                        key={swatch.id}
                        className={`color-swatch-btn ${isSelected ? 'active' : ''}`}
                        style={{ backgroundColor: swatch.color }}
                        title={swatch.label}
                        onClick={() => setColors((prev) => ({ ...prev, [colorPart]: swatch.id }))}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="outfit-modal-footer">
          <div className="outfit-footer-summary">
            <span>Personagem: <strong>{activeChar.name}</strong></span>
            <span> · Outfit: <strong>{selectedOutfit}</strong></span>
            {selectedMount !== 'none' && mountActive && (
              <span> · Montaria: <strong>{AVAILABLE_MOUNTS.find((m) => m.id === selectedMount)?.name}</strong></span>
            )}
          </div>
          <div className="outfit-footer-buttons">
            <button type="button" className="outfit-cancel-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" className="outfit-confirm-btn" onClick={handleSave}>
              ✓ Salvar Outfit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
