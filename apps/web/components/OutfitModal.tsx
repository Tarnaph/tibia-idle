import React, { useState, useEffect, useRef } from 'react';
import type { CharacterState } from '@/packages/domain/src/types';
import rawOutfitsJson from '@/content/generated/outfits.json';
import rawMountsJson from '@/content/generated/mounts.json';
import {
  TIBIA_133_COLORS,
  normalizeOutfitId,
  normalizeMountId,
  getOutfitCapabilities,
  renderRecoloredOutfit,
  preloadOutfitAllFrames,
  prepareAppearanceCanvas,
  clearFailedImageCache,
  isOutfitCanvasCached,
  getCanvasCacheKey,
  type OutfitColors,
} from '@/apps/web/lib/outfitRecolor';
import { outfitDiagnostics } from '@/apps/web/lib/outfitDiagnostics';
import { preloadAppearanceAtlas, cancelAtlasScope } from '@/apps/web/lib/outfitAtlasLoader';
import {
  loadThumbnailAtlas,
  isThumbnailAtlasReady,
  getThumbnailAtlasFrame,
} from '@/apps/web/lib/thumbnailAtlasLoader';
import {
  getOutfitTier,
  isOutfitUnlockedFor,
  getMountTier,
  isMountUnlockedFor,
  isStaff,
  isAddonUnlockedFor,
  getAddonQuestFor,
  parseUnlockedAddons,
  type UserAppearanceContext,
} from '@/packages/domain/src/appearancePermissions';
import { getCanonicalItemUrl } from '@/apps/web/lib/assetPaths';

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

export const CLASSIC_OUTFITS: OutfitOption[] = [
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
  { id: 'Oriental', name: 'Oriental', description: 'Vestimentas exóticas do distante continente oriental.', isPremium: true },
  { id: 'Pirate', name: 'Pirate', description: 'Traje clássico de bucaneiro dos sete mares.', isPremium: true },
  { id: 'Assassin', name: 'Assassin', description: 'Vestimenta de mestre assassino das sombras.', isPremium: true },
  { id: 'Beggar', name: 'Beggar', description: 'Vestimenta humilde de andarilho aventureiro.', isPremium: true },
];

const EXTRA_OUTFITS: OutfitOption[] = (rawOutfitsJson as Array<{
  id: string;
  name: string;
  femaleName: string;
  maleName: string;
  premium: boolean;
  unlocked: boolean;
}>)
  .filter((o) => {
    const norm = o.name.toLowerCase();
    return !CLASSIC_OUTFITS.some(
      (c) => c.name.toLowerCase() === norm || c.id.toLowerCase() === norm || (norm === 'nobleman' && c.name.toLowerCase() === 'noble')
    );
  })
  .map((o) => ({
    id: o.id,
    name: o.name,
    description: `Vestimenta oficial de Tibia: ${o.name}.`,
    isPremium: o.premium,
  }));

export const AVAILABLE_OUTFITS: OutfitOption[] = [...CLASSIC_OUTFITS, ...EXTRA_OUTFITS];

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
  { id: 'none', name: 'Sem Montaria', speedBonus: 0, description: 'Caminhe normalmente a pé pelo mapa.' },
  ...PARSED_MOUNTS,
];

// Backwards compatibility for tests that import TIBIA_PALETTE
export const TIBIA_PALETTE = TIBIA_133_COLORS.slice(0, 16).map((color, id) => ({
  id,
  color,
  label: `Cor ${id}`,
}));

const DIRECTIONS = ['south', 'east', 'north', 'west'] as const;
type Direction = (typeof DIRECTIONS)[number];

function CardThumbnail({
  type,
  id,
  alt,
  className,
  fallback,
  atlasLoaded,
}: {
  type: 'outfits' | 'mounts';
  id: string;
  alt: string;
  className?: string;
  fallback: string;
  atlasLoaded: boolean;
}) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '120px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!inView) {
    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      />
    );
  }

  const frameInfo = atlasLoaded ? getThumbnailAtlasFrame(type, id) : null;
  if (frameInfo) {
    return (
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          className={className}
          style={{
            width: '64px',
            height: '64px',
            backgroundImage: `url(${frameInfo.atlasUrl})`,
            backgroundPosition: `-${frameInfo.frame.x}px -${frameInfo.frame.y}px`,
            backgroundRepeat: 'no-repeat',
            imageRendering: 'pixelated',
            flexShrink: 0,
          }}
          role="img"
          aria-label={alt}
          title={alt}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <img
        src={fallback}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={className}
        style={{ imageRendering: 'pixelated' }}
        onError={(e) => {
          if (fallback && e.currentTarget.src !== fallback && !e.currentTarget.src.endsWith(fallback)) {
            e.currentTarget.src = fallback;
          }
        }}
      />
    </div>
  );
}

interface Props {
  open: boolean;
  characters: CharacterState[];
  activeCharacterId: string;
  onClose(): void;
  onOpenCharacterProfile?: (characterId: string) => void;
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

export function OutfitModal({ open, characters, activeCharacterId, onClose, onOpenCharacterProfile, onSave }: Props) {
  const initialChar = characters.find((c) => c.id === (activeCharacterId || characters[0]?.id)) || characters[0];
  const initialOutfit = initialChar ? (initialChar.outfit || initialChar.baseVocation || 'Knight') : 'Knight';
  const initialHasMount = Boolean(initialChar?.mount && initialChar.mount !== 'none');
  const initialMountActive = Boolean(initialHasMount && (initialChar.mountActive !== undefined ? initialChar.mountActive : true));
  const initialMount = initialMountActive ? initialChar!.mount! : 'none';
  const initialEquippedMount = initialHasMount ? initialChar!.mount! : 'donkey';
  const initialCaps = getOutfitCapabilities(initialOutfit);
  const initialAddons = initialChar?.addons || 0;
  const initialColors = initialChar?.outfitColors || { head: 0, primary: 86, secondary: 114, detail: 76 };

  const [selectedCharId, setSelectedCharId] = useState(activeCharacterId);
  const [topTab, setTopTab] = useState<'character' | 'outfit'>('outfit');
  const [selectedTab, setSelectedTab] = useState<'outfits' | 'mounts'>('outfits');
  const [selectedOutfit, setSelectedOutfit] = useState(() => initialOutfit);
  const [selectedMount, setSelectedMount] = useState(() => initialMount);
  const [equippedMount, setEquippedMount] = useState(() => initialEquippedMount);
  const [mountActive, setMountActive] = useState(() => initialMountActive && initialCaps.hasMountRider);
  const [addon1, setAddon1] = useState(() => Boolean(initialCaps.hasAddon1 && (initialAddons & 1) !== 0));
  const [addon2, setAddon2] = useState(() => Boolean(initialCaps.hasAddon2 && (initialAddons & 2) !== 0));
  const [directionIdx, setDirectionIdx] = useState(0);
  const [colorPart, setColorPart] = useState<'head' | 'primary' | 'secondary' | 'detail'>('head');
  const [colors, setColors] = useState<OutfitColors>(() => initialColors);
  const [filterAcquired, setFilterAcquired] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastSyncedCharRef = useRef<string | null>(null);
  const prevOpenRef = useRef<boolean>(false);
  const renderGenRef = useRef<number>(0);

  const activeChar = characters.find((c) => c.id === selectedCharId) || characters[0];
  const charGender: 'male' | 'female' = activeChar?.gender === 'female' ? 'female' : 'male';
  const currentCaps = getOutfitCapabilities(selectedOutfit);

  const [outfitAtlasReady, setOutfitAtlasReady] = useState(() => isThumbnailAtlasReady('outfits'));
  const [mountAtlasReady, setMountAtlasReady] = useState(() => isThumbnailAtlasReady('mounts'));

  const [localUnlockedAddons, setLocalUnlockedAddons] = useState<Record<string, number[]>>(() =>
    parseUnlockedAddons(initialChar?.unlockedAddonsJson)
  );
  const [localInventory, setLocalInventory] = useState<Array<{ id?: string; serverId: number; name: string; count: number }>>(() =>
    (initialChar as any)?.inventoryItems || (initialChar as any)?.inventory || []
  );
  const [isTradingQuest, setIsTradingQuest] = useState(false);
  const [questFeedback, setQuestFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showQuest1, setShowQuest1] = useState(false);
  const [showQuest2, setShowQuest2] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  const userCtx: UserAppearanceContext = {
    isPremium: Boolean(activeChar?.isPremium),
    role: (activeChar as any)?.role,
    adminTitle: activeChar?.adminTitle,
  };
  const isUserStaff = isStaff(userCtx);

  const isAddon1Unlocked = isAddonUnlockedFor(selectedOutfit, 1, JSON.stringify(localUnlockedAddons), userCtx);
  const isAddon2Unlocked = isAddonUnlockedFor(selectedOutfit, 2, JSON.stringify(localUnlockedAddons), userCtx);
  const quest1Def = getAddonQuestFor(selectedOutfit, 1);
  const quest2Def = getAddonQuestFor(selectedOutfit, 2);

  const getMaterialCount = (itemId: number) => {
    let total = 0;
    for (const it of localInventory) {
      if (it.serverId === itemId || (it as any).id === itemId) {
        total += (it.count || 1);
      }
    }
    return total;
  };

  const hasAllMaterialsForQuest1 = quest1Def
    ? quest1Def.materials.every((m) => getMaterialCount(m.itemId) >= m.count)
    : false;

  const handleTradeQuest = async (questId: string, addonNum: 1 | 2) => {
    if (isTradingQuest) return;
    setIsTradingQuest(true);
    setQuestFeedback(null);
    try {
      const token =
        (typeof window !== 'undefined' &&
          (localStorage.getItem('tibia_auth_token') ||
            localStorage.getItem('colyseus_token') ||
            sessionStorage.getItem('tibia_auth_token'))) ||
        '';
      const targetCharId = selectedCharId || activeCharacterId || characters[0]?.id;
      const res = await fetch(`/api/characters/${targetCharId}/trade-addon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questId }),
      });
      const json = (await res.json()) as any;
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Erro ao realizar troca dos materiais.');
      }

      setQuestFeedback({ text: json.message || 'Addon desbloqueado com sucesso!', type: 'success' });
      if (json.data?.unlockedAddons) {
        setLocalUnlockedAddons(json.data.unlockedAddons);
      }
      if (json.data?.inventory) {
        setLocalInventory(json.data.inventory);
      }
      if (addonNum === 1) {
        setAddon1(true);
      } else {
        setAddon2(true);
      }
    } catch (err: any) {
      setQuestFeedback({ text: err.message || 'Falha ao trocar materiais.', type: 'error' });
    } finally {
      setIsTradingQuest(false);
    }
  };

  // On-demand loading of thumbnail atlas when modal opens or tab switches
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    if (selectedTab === 'outfits') {
      loadThumbnailAtlas('outfits').then((ready) => {
        if (isMounted && ready) setOutfitAtlasReady(true);
      });
    } else {
      loadThumbnailAtlas('mounts').then((ready) => {
        if (isMounted && ready) setMountAtlasReady(true);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [open, selectedTab]);

  // Pre-warm atlas textures via speculative download as soon as appearance selection changes
  useEffect(() => {
    if (!open) return;
    preloadAppearanceAtlas(selectedOutfit, charGender, selectedMount).catch(() => {});
  }, [open, selectedOutfit, charGender, selectedMount]);

  // Sync state ONLY when modal newly opens or when user explicitly changes selected character
  useEffect(() => {
    if (!open) {
      setIsSaving(false);
      lastSyncedCharRef.current = null;
      prevOpenRef.current = false;
      return;
    }

    const isNewlyOpened = !prevOpenRef.current;
    prevOpenRef.current = true;

    if (isNewlyOpened) {
      clearFailedImageCache();
      if (activeCharacterId && selectedCharId !== activeCharacterId) {
        setSelectedCharId(activeCharacterId);
      }
      const targetChar = characters.find((c) => c.id === (activeCharacterId || selectedCharId)) || characters[0];
      if (targetChar) {
        const hasPriorAttempt = Boolean(outfitDiagnostics.getCurrentAttempt());
        outfitDiagnostics.startAttempt(
          {
            characterId: targetChar.id,
            characterName: targetChar.name,
            outfit: targetChar.outfit,
            mount: targetChar.mount,
            mountActive: targetChar.mountActive,
            addons: targetChar.addons,
            colors: targetChar.outfitColors,
          },
          hasPriorAttempt
        );
      }
    }

    const targetCharId = isNewlyOpened && activeCharacterId ? activeCharacterId : selectedCharId;

    if (isNewlyOpened || lastSyncedCharRef.current !== targetCharId) {
      lastSyncedCharRef.current = targetCharId;
      const char = characters.find((c) => c.id === targetCharId) || characters[0];
      if (char) {
        const outfit = char.outfit || char.baseVocation || 'Knight';
        setSelectedOutfit(outfit);
        const hasMount = Boolean(char.mount && char.mount !== 'none');
        const userMount = hasMount ? char.mount! : 'none';
        const effectiveEq = hasMount ? char.mount! : 'donkey';
        setEquippedMount(effectiveEq);
        const caps = getOutfitCapabilities(outfit);
        const isMntActive = caps.hasMountRider && hasMount && (char.mountActive !== undefined ? char.mountActive : true);
        setMountActive(Boolean(isMntActive));
        setSelectedMount(isMntActive ? effectiveEq : 'none');
        const addons = char.addons || 0;
        setAddon1(caps.hasAddon1 && (addons & 1) !== 0);
        setAddon2(caps.hasAddon2 && (addons & 2) !== 0);
        if (char.outfitColors) setColors(char.outfitColors);
        setLocalUnlockedAddons(parseUnlockedAddons(char.unlockedAddonsJson));
        setLocalInventory((char as any).inventoryItems || (char as any).inventory || []);
        setQuestFeedback(null);
        setPermissionNotice(null);
      }
    }
  }, [selectedCharId, activeCharacterId, open]);

  const isMounted = Boolean(mountActive && selectedMount !== 'none' && currentCaps.hasMountRider);
  const currentDir = DIRECTIONS[directionIdx];

  const handleSelectOutfit = (outfitId: string) => {
    const isDifferentOutfit = outfitId !== selectedOutfit;
    setSelectedOutfit(outfitId);
    setQuestFeedback(null);

    const tier = getOutfitTier(outfitId);
    if (tier === 'store') {
      setPermissionNotice(`Traje "${outfitId}" pertence à Loja. Estará disponível em breve via Exura Coins.`);
    } else if (tier === 'premium' && !userCtx.isPremium && !isUserStaff) {
      setPermissionNotice(`Traje "${outfitId}" é exclusivo para jogadores com conta Premium.`);
    } else {
      setPermissionNotice(null);
    }

    if (isDifferentOutfit) {
      // Ao trocar de outfit, inicia sem addons para que o usuário escolha marcá-los
      setAddon1(false);
      setAddon2(false);
    } else {
      const caps = getOutfitCapabilities(outfitId);
      if (!caps.hasAddon1 && addon1) {
        setAddon1(false);
      }
      if (!caps.hasAddon2 && addon2) {
        setAddon2(false);
      }
    }
    const caps = getOutfitCapabilities(outfitId);
    if (!caps.hasMountRider) {
      setMountActive(false);
    } else if (selectedMount && selectedMount !== 'none') {
      setMountActive(true);
    }
  };

  // Live recolor preview on canvas whenever outfit, direction, colors, addons, or mount change
  // Generation counter invalidates stale in-flight renders
  useEffect(() => {
    if (!open) return;

    if (previewCanvasRef.current) {
      const thisGen = ++renderGenRef.current;
      const caps = getOutfitCapabilities(selectedOutfit);
      let addonsVal = 0;
      if (addon1 && caps.hasAddon1) addonsVal |= 1;
      if (addon2 && caps.hasAddon2) addonsVal |= 2;
      const effectiveMounted = Boolean(mountActive && selectedMount !== 'none' && caps.hasMountRider);
      const renderStartTime = Date.now();

      // Cancel any previous in-flight requests that were only needed for modal preview
      cancelAtlasScope('modal_preview');

      outfitDiagnostics.updateSelection({
        outfit: selectedOutfit,
        mount: selectedMount,
        mountActive: effectiveMounted,
        addons: addonsVal,
        colors,
        direction: currentDir,
      });

      outfitDiagnostics.recordPreviewPreparation({
        status: 'preparing',
        durationMs: 0,
      });

      console.log('[OutfitModal preview useEffect]', {
        selectedOutfit,
        charGender,
        currentDir,
        selectedMount,
        mountActive,
        effectiveMounted,
        addonsVal,
        thisGen,
      });
      renderRecoloredOutfit(
        previewCanvasRef.current,
        selectedOutfit,
        charGender,
        currentDir,
        0,
        colors,
        addonsVal,
        selectedMount,
        effectiveMounted,
        () => renderGenRef.current === thisGen,
        'modal_preview'
      ).then(() => {
        if (renderGenRef.current === thisGen) {
          const cvs = previewCanvasRef.current;
          const normOutfit = normalizeOutfitId(selectedOutfit);
          const drawnKey = getCanvasCacheKey(
            normOutfit,
            charGender,
            currentDir,
            0,
            colors,
            addonsVal,
            selectedMount,
            effectiveMounted
          );
          const isDefinitive = isOutfitCanvasCached(
            selectedOutfit,
            charGender,
            currentDir,
            0,
            colors,
            addonsVal,
            selectedMount,
            effectiveMounted
          );
          const curAttempt = outfitDiagnostics.getCurrentAttempt();
          const matchesSelection =
            isDefinitive &&
            curAttempt?.selection.outfit?.toLowerCase() === selectedOutfit.toLowerCase() &&
            (selectedMount === 'none' || !effectiveMounted || curAttempt?.selection.mount?.toLowerCase() === selectedMount.toLowerCase());

          const durationMs = Date.now() - renderStartTime;
          outfitDiagnostics.recordPreviewPreparation({
            status: isDefinitive ? 'ready' : 'failed',
            durationMs,
            success: isDefinitive,
            cachedFramesCount: isDefinitive ? 1 : 0,
            totalFramesRequested: 1,
          });

          outfitDiagnostics.recordPreview({
            hasCanvas: !!cvs,
            width: cvs?.width || 0,
            height: cvs?.height || 0,
            dataUrlLen: cvs ? cvs.toDataURL().length : 0,
            lastDrawnKey: drawnKey,
            isDefinitive,
            matchesSelection,
            drawnOutfit: selectedOutfit,
            drawnMount: selectedMount,
          });
        }
      }).catch((err) => {
        console.warn('Outfit preview render non-fatal exception caught:', err);
      });
    }

    return () => {
      cancelAtlasScope('modal_preview');
    };
  }, [
    open,
    selectedOutfit,
    charGender,
    currentDir,
    colors,
    mountActive,
    addon1,
    addon2,
    selectedMount,
  ]);

  if (!open) return null;

  const charIdx = characters.findIndex((c) => c.id === selectedCharId);

  const prevPartyMember = () => {
    if (characters.length <= 1) return;
    const nextIdx = (charIdx - 1 + characters.length) % characters.length;
    setSelectedCharId(characters[nextIdx].id);
  };

  const nextPartyMember = () => {
    if (characters.length <= 1) return;
    const nextIdx = (charIdx + 1) % characters.length;
    setSelectedCharId(characters[nextIdx].id);
  };

  const rotatePrev = () => {
    setDirectionIdx((prev) => (prev - 1 + 4) % 4);
  };

  const rotateNext = () => {
    setDirectionIdx((prev) => (prev + 1) % 4);
  };

  // Resolve thumbnail for outfit cards based on active character gender
  const getOutfitThumbUrl = (outfitId: string, gender: 'male' | 'female' = charGender): string => {
    const idLower = normalizeOutfitId(outfitId);
    return `/generated/outfit-thumbs/${idLower}.png`;
  };

  // Resolve thumbnail for mount cards
  const getMountThumbUrl = (mountId: string): string | null => {
    if (!mountId || mountId === 'none') return null;
    return `/generated/mounts/${mountId}.png`;
  };

  const handleSave = () => {
    if (isSaving) return;

    if (!isOutfitUnlockedFor(selectedOutfit, userCtx)) {
      alert(`Você não possui acesso ao traje "${selectedOutfit}". Ele pertence à Loja ou exige conta Premium.`);
      return;
    }

    const isMnt = Boolean(mountActive && selectedMount !== 'none' && currentCaps.hasMountRider);
    const effectiveMount = isMnt ? selectedMount : (equippedMount || selectedMount || 'donkey');

    if (isMnt && !isMountUnlockedFor(effectiveMount, userCtx)) {
      alert(`A montaria selecionada é exclusiva para contas Premium.`);
      return;
    }

    setIsSaving(true);
    outfitDiagnostics.recordSaveClick();
    const effectiveCharId = selectedCharId || activeCharacterId || characters[0]?.id;
    let addonsVal = 0;
    if (addon1 && currentCaps.hasAddon1 && isAddon1Unlocked) addonsVal |= 1;
    if (addon2 && currentCaps.hasAddon2 && isAddon2Unlocked) addonsVal |= 2;
    console.log('[OutfitModal handleSave]', {
      effectiveCharId,
      selectedOutfit,
      selectedMount,
      equippedMount,
      mountActive,
      isMnt,
      effectiveMount,
      addonsVal,
    });
    onSave(effectiveCharId, {
      outfit: selectedOutfit,
      mount: effectiveMount,
      mountActive: isMnt,
      addons: addonsVal,
      outfitColors: colors,
    });
    onClose();
  };

  const currentColorIdx = colors[colorPart] ?? 0;
  const activePartHex = TIBIA_133_COLORS[currentColorIdx] || '#ffffff';

  const isCharPremium = Boolean(activeChar?.isPremium);
  const outfitsToDisplay = filterAcquired
    ? AVAILABLE_OUTFITS.filter((o) => isCharPremium || !o.isPremium || o.id === activeChar.outfit)
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
            onClick={() => {
              if (onOpenCharacterProfile) {
                onClose();
                onOpenCharacterProfile(selectedCharId);
              } else {
                setTopTab('character');
              }
            }}
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
            {permissionNotice && (
              <div
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(192, 132, 252, 0.4)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: '#e9d5ff',
                  lineHeight: '1.4',
                  marginBottom: '4px',
                }}
              >
                ⚠️ {permissionNotice}
              </div>
            )}

            {questFeedback && (
              <div
                style={{
                  backgroundColor: questFeedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${questFeedback.type === 'success' ? '#4ade80' : '#f87171'}`,
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  color: questFeedback.type === 'success' ? '#86efac' : '#fca5a5',
                  lineHeight: '1.4',
                  marginBottom: '4px',
                }}
              >
                {questFeedback.type === 'success' ? '🎉 ' : '⚠️ '}
                {questFeedback.text}
              </div>
            )}

            {/* Addon 1 Block */}
            <div className={`tibia-beveled-check-box ${!currentCaps.hasAddon1 ? 'disabled opacity-50 pointer-events-none' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <label className="tibia-check-label" style={{ cursor: isAddon1Unlocked ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={addon1 && currentCaps.hasAddon1 && isAddon1Unlocked}
                    disabled={!currentCaps.hasAddon1 || !isAddon1Unlocked}
                    onChange={(e) => setAddon1(e.target.checked)}
                    className="tibia-custom-checkbox"
                  />
                  <span className="tibia-check-text">
                    Addon 1 {!currentCaps.hasAddon1 && '(Indisponível)'}
                  </span>
                </label>
                {currentCaps.hasAddon1 && !isAddon1Unlocked && (
                  <button
                    type="button"
                    className="tibia-addon-quest-badge"
                    onClick={() => setShowQuest1((p) => !p)}
                    title="Ver requisitos da missão para liberar este addon"
                  >
                    📜 Quest {showQuest1 ? '▲' : '▼'}
                  </button>
                )}
              </div>
            </div>

            {/* Addon 1 Quest Detail Panel */}
            {currentCaps.hasAddon1 && !isAddon1Unlocked && showQuest1 && (
              <div className="tibia-addon-quest-panel">
                {quest1Def ? (
                  <>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#facc15' }}>
                      {quest1Def.name}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.3 }}>
                      {quest1Def.description}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {quest1Def.materials.map((mat) => {
                        const count = getMaterialCount(mat.itemId);
                        const isDone = count >= mat.count;
                        return (
                          <div key={mat.itemId} className="tibia-addon-material-row">
                            <div className="tibia-addon-mat-info">
                              <img
                                src={getCanonicalItemUrl(mat.itemId)}
                                alt={mat.name}
                                className="tibia-addon-mat-sprite"
                                onError={(e) => {
                                  (e.target as any).style.display = 'none';
                                }}
                              />
                              <span style={{ color: '#e2e8f0' }}>{mat.name}</span>
                            </div>
                            <span className={`tibia-addon-mat-count ${isDone ? 'complete' : 'incomplete'}`}>
                              {count}/{mat.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {hasAllMaterialsForQuest1 ? (
                      <button
                        type="button"
                        className="tibia-addon-trade-btn"
                        disabled={isTradingQuest}
                        onClick={() => handleTradeQuest(quest1Def.id, 1)}
                      >
                        {isTradingQuest ? 'Trocando...' : '⭐ Trocar (Liberar Addon)'}
                      </button>
                    ) : (
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic', marginTop: '2px' }}>
                        Colete os itens restantes nas caçadas de Troll, Spider, Skeleton e Rotworm.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Em breve: Missão necessária para conquistar este addon.
                  </div>
                )}
              </div>
            )}

            {/* Addon 2 Block */}
            <div className={`tibia-beveled-check-box ${!currentCaps.hasAddon2 ? 'disabled opacity-50 pointer-events-none' : ''}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <label className="tibia-check-label" style={{ cursor: isAddon2Unlocked ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={addon2 && currentCaps.hasAddon2 && isAddon2Unlocked}
                    disabled={!currentCaps.hasAddon2 || !isAddon2Unlocked}
                    onChange={(e) => setAddon2(e.target.checked)}
                    className="tibia-custom-checkbox"
                  />
                  <span className="tibia-check-text">
                    Addon 2 {!currentCaps.hasAddon2 && '(Indisponível)'}
                  </span>
                </label>
                {currentCaps.hasAddon2 && !isAddon2Unlocked && (
                  <button
                    type="button"
                    className="tibia-addon-quest-badge"
                    onClick={() => setShowQuest2((p) => !p)}
                    title="Ver requisitos da missão para liberar este addon"
                  >
                    📜 Quest {showQuest2 ? '▲' : '▼'}
                  </button>
                )}
              </div>
            </div>

            {/* Addon 2 Quest Detail Panel */}
            {currentCaps.hasAddon2 && !isAddon2Unlocked && showQuest2 && (
              <div className="tibia-addon-quest-panel">
                {quest2Def ? (
                  <div>{quest2Def.name}</div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Em breve: Missão necessária para conquistar este addon.
                  </div>
                )}
              </div>
            )}

            <div className={`tibia-beveled-check-box ${!currentCaps.hasMountRider ? 'disabled opacity-50' : ''}`}>
              <label className="tibia-check-label">
                <input
                  type="checkbox"
                  checked={Boolean(mountActive && selectedMount !== 'none' && currentCaps.hasMountRider)}
                  disabled={!currentCaps.hasMountRider}
                  onChange={(e) => {
                    const nextVal = e.target.checked;
                    setMountActive(nextVal);
                    if (nextVal) {
                      const mountToRestore = (equippedMount && equippedMount !== 'none') ? equippedMount : 'donkey';
                      setSelectedMount(mountToRestore);
                    } else {
                      setSelectedMount('none');
                    }
                  }}
                  className="tibia-custom-checkbox"
                />
                <span className="tibia-check-text">
                  {!currentCaps.hasMountRider
                    ? 'Montaria (Sem suporte neste traje)'
                    : (!mountActive || selectedMount === 'none')
                    ? `Montaria (Desativada - ${AVAILABLE_MOUNTS.find((m) => m.id === equippedMount)?.name || equippedMount || 'Donkey'})`
                    : `Montaria: ${AVAILABLE_MOUNTS.find((m) => m.id === selectedMount)?.name || selectedMount}`}
                </span>
              </label>
            </div>

            <div className="tibia-preview-box">
              <div className="tibia-preview-inner">
                <canvas
                  ref={previewCanvasRef}
                  width={64}
                  height={64}
                  className={`tibia-preview-sprite ${isMounted ? 'mounted' : 'on-foot'}`}
                  style={{
                    imageRendering: 'pixelated',
                    width: '64px',
                    height: '64px',
                  }}
                />
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
                  const isSelected = normalizeOutfitId(selectedOutfit) === normalizeOutfitId(outfit.id);
                  return (
                    <div
                      key={outfit.id}
                      className={`tibia-card-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        handleSelectOutfit(outfit.id);
                      }}
                    >
                      <div className="tibia-card-sprite-wrap">
                        <CardThumbnail
                          type="outfits"
                          id={normalizeOutfitId(outfit.id)}
                          alt={outfit.name}
                          className="tibia-card-sprite"
                          fallback={getOutfitThumbUrl(outfit.id, charGender)}
                          atlasLoaded={outfitAtlasReady}
                        />
                      </div>
                      <span className="tibia-card-name">{outfit.name}</span>
                      {(() => {
                        const tier = getOutfitTier(outfit.id);
                        if (tier === 'store') {
                          return <span className="tibia-card-badge-store">Loja</span>;
                        }
                        if (tier === 'premium') {
                          return <span className="tibia-card-badge-premium">Premium</span>;
                        }
                        return <span className="tibia-card-badge-free">Básico</span>;
                      })()}
                    </div>
                  );
                })
              ) : (
                AVAILABLE_MOUNTS.map((mount) => {
                  const isCardActive = mount.id === 'none'
                    ? (!mountActive || selectedMount === 'none')
                    : (mountActive && normalizeMountId(selectedMount) === normalizeMountId(mount.id));
                  const mountTier = getMountTier(mount.id);
                  const isMountAllowed = isMountUnlockedFor(mount.id, userCtx);

                  return (
                    <div
                      key={mount.id}
                      className={`tibia-card-item ${isCardActive ? 'active' : ''} ${!isMountAllowed ? 'locked-card' : ''}`}
                      onClick={() => {
                        if (mount.id === 'none') {
                          setSelectedMount('none');
                          setMountActive(false);
                          setPermissionNotice(null);
                        } else if (!isMountAllowed) {
                          setPermissionNotice(`A montaria "${mount.name}" é exclusiva para jogadores com conta Premium.`);
                        } else {
                          setEquippedMount(mount.id);
                          setSelectedMount(mount.id);
                          setMountActive(true);
                          setPermissionNotice(null);
                        }
                      }}
                    >
                      <div className="tibia-card-sprite-wrap">
                        {getMountThumbUrl(mount.id) ? (
                          <CardThumbnail
                            type="mounts"
                            id={mount.id}
                            alt={mount.name}
                            className="tibia-card-sprite mount-sprite"
                            fallback={getMountThumbUrl(mount.id)!}
                            atlasLoaded={mountAtlasReady}
                          />
                        ) : (
                          <div className="tibia-card-no-mount-placeholder" title="Sem Montaria">
                            <span style={{ fontSize: '24px', opacity: 0.85 }}>🚶</span>
                          </div>
                        )}
                      </div>
                      <span className="tibia-card-name">{mount.name}</span>
                      {mount.id === 'none' ? (
                        <span className="tibia-card-badge-free">A pé</span>
                      ) : mountTier === 'free' ? (
                        <span className="tibia-card-badge-free">Básico</span>
                      ) : (
                        <span className="tibia-card-badge-premium">Premium</span>
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
          <button
            type="button"
            className="tibia-footer-btn-diag"
            onClick={() => {
              const ok = outfitDiagnostics.copyReportToClipboard();
              if (ok) {
                alert('Relatório de diagnóstico copiado! Cole aqui no chat.');
              } else {
                const rep = outfitDiagnostics.getLatestReport();
                if (rep) {
                  prompt('Copie o JSON de diagnóstico abaixo:', JSON.stringify(rep));
                } else {
                  alert('Nenhum diagnóstico registrado ainda.');
                }
              }
            }}
            title="Copiar relatório de diagnóstico de troca de outfit/montaria para a área de transferência"
            style={{
              marginRight: '8px',
              backgroundColor: '#1e293b',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              borderRadius: '4px',
              padding: '5px 12px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            📋 Copiar Diagnóstico
          </button>
          <button
            type="button"
            className="tibia-footer-btn-diag-save"
            onClick={() => {
              const ok = outfitDiagnostics.copyLastSaveReportToClipboard();
              if (ok) {
                alert('Relatório do último salvamento copiado! Cole aqui no chat.');
              } else {
                const rep = outfitDiagnostics.getLastSaveAttempt() || outfitDiagnostics.getLatestReport();
                if (rep) {
                  prompt('Copie o JSON do último salvamento abaixo:', JSON.stringify(rep));
                } else {
                  alert('Nenhum salvamento registrado ainda.');
                }
              }
            }}
            title="Copiar especificamente o relatório do último salvamento"
            style={{
              marginRight: 'auto',
              backgroundColor: '#1e293b',
              color: '#34d399',
              border: '1px solid #34d399',
              borderRadius: '4px',
              padding: '5px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            💾 Copiar Último Save
          </button>
          <button type="button" className="tibia-footer-btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="tibia-footer-btn-save"
            onClick={handleSave}
            disabled={isSaving}
            style={isSaving ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
