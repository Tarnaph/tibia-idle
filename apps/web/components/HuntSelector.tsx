'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { HuntDefinition, HuntPullSize } from '@/packages/domain/src';
import { getPullSizeMonsterPool } from '@/packages/domain/src/huntRoute';
import type { MonsterDefinition } from '@/packages/content-schema/src';
import { useGameModal } from '@/apps/web/contexts/GameModalContext';

interface Props {
  open: boolean;
  hunts: HuntDefinition[];
  monsters: MonsterDefinition[];
  level: number;
  currentHuntId?: string;
  isInCity?: boolean;
  isPartyLeader?: boolean;
  initialTab?: ActiveTab;
  isMobile?: boolean;
  onClose(): void;
  onSelect(huntId: string, pullSize?: HuntPullSize): void;
  onSelectWithTeam?(huntId: string, huntName: string, pullSize?: HuntPullSize): void;
  onOpenPartyModal?: () => void;
  onStartTraining?: (skill: string) => void;
  onOpenArena?: () => void;
  onOpenQuests?: () => void;
  onOpenBosses?: () => void;
}

export type { ActiveTab };
type ActiveTab = 'CAÇADAS' | 'TREINO' | 'QUESTS';
type ViewMode = 'catalog' | 'setup';

interface StatRecord {
  soloXp: string;
  soloGp: string;
  partyXp?: string;
  partyGp?: string;
}

const HUNT_STATS_MAP: Record<string, StatRecord> = {
  'rat-cellars': { soloXp: '2.0K XP/h', soloGp: '1.3K gp/h', partyXp: '9.1K XP/h', partyGp: '-15K gp/h' },
  'spider-burrow': { soloXp: '7.6K XP/h', soloGp: '1.3K gp/h' },
  'troll-camp': { soloXp: '9.7K XP/h', soloGp: '5.1K gp/h' },
  'old-crypt': { soloXp: '14.2K XP/h', soloGp: '4.8K gp/h' },
  'rotworm-cave': { soloXp: '37.2K XP/h', soloGp: '8.4K gp/h' },
  'cyclops-camp': { soloXp: '18.5K XP/h', soloGp: '7.8K gp/h' },
  'elf-sanctuary': { soloXp: '24.0K XP/h', soloGp: '11.2K gp/h' },
  'dragon-lair': { soloXp: '65.0K XP/h', soloGp: '18.0K gp/h', partyXp: '120.0K XP/h', partyGp: '32.0K gp/h' },
  'corym-mine': { soloXp: '35.0K XP/h', soloGp: '14.5K gp/h' },
  'giant-spider-lair': { soloXp: '48.0K XP/h', soloGp: '16.2K gp/h' },
  'hero-cave': { soloXp: '85.0K XP/h', soloGp: '22.0K gp/h', partyXp: '160.0K XP/h', partyGp: '45.0K gp/h' },
  'hydra-lair': { soloXp: '110.0K XP/h', soloGp: '28.0K gp/h', partyXp: '210.0K XP/h', partyGp: '55.0K gp/h' },
};

export interface QuestItem {
  id: string;
  name: string;
  levelReq: number;
  status: 'active' | 'available' | 'completed';
  category: string;
  location: string;
  description: string;
  objectives: { text: string; done: boolean }[];
  rewards: { xp: string; gp: string; items: string[] };
}

export const DEFAULT_QUESTS: QuestItem[] = [
  {
    id: 'citizen-addon-1',
    name: 'Primeiros Passos de um Cidadão (Addon 1)',
    levelReq: 1,
    status: 'available',
    category: 'Addon de Traje',
    location: 'Thais (Aventureiro)',
    description: 'Reúna materiais de criaturas por todo o continente para confeccionar a tradicional mochila do Citizen (Addon 1). Os materiais podem ser entregues diretamente na aba de customização de aparência do seu personagem.',
    objectives: [
      { text: '5x Bunch of Troll Hair (Troll em Troll Camp)', done: false },
      { text: '3x Spider Fangs (Spider em Spider Burrow)', done: false },
      { text: '50x Bone (Skeleton em Old Crypt)', done: false },
      { text: '20x Lump of Dirt (Rotworm em Rotworm Cave)', done: false },
    ],
    rewards: { xp: '1.500 XP', gp: '0 gp', items: ['Citizen — Addon 1 (Mochila)'] },
  },
  {
    id: 'thais-sewers',
    name: 'Infestação nos Esgotos de Thais',
    levelReq: 1,
    status: 'active',
    category: 'Cidade de Thais',
    location: 'Esgotos Subterrâneos de Thais',
    description: 'Os cidadãos de Thais reclamam de barulhos constantes vindos dos bueiros. Desça aos esgotos, investigue a passagem e extermine os roedores e criaturas sombrias.',
    objectives: [
      { text: 'Entrar nos esgotos pelo bueiro oeste', done: true },
      { text: 'Derrotar 15 Ratos das Cavernas', done: false },
      { text: 'Recuperar o anel perdido do guarda real', done: false },
    ],
    rewards: { xp: '850 XP', gp: '350 gp', items: ['Brass Legs', 'Small Health Potion x3'] },
  },
  {
    id: 'cyclops-threat',
    name: 'A Ameaça dos Cíclopes',
    levelReq: 15,
    status: 'available',
    category: 'Montanhas & Forjas',
    location: 'Mount Sternum',
    description: 'Ferreiros cíclopes estão fundindo armas suspeitas nas cavernas do Mount Sternum. A guarnição de Thais solicitou reconhecimento e contenção dos batedores.',
    objectives: [
      { text: 'Explorar a entrada da forja profunda', done: false },
      { text: 'Derrotar 20 Cíclopes e 5 Cyclops Drones', done: false },
      { text: 'Coletar 3 Heavy Maces como prova de armamento', done: false },
    ],
    rewards: { xp: '4.800 XP', gp: '1.500 gp', items: ['Dark Helmet', 'Mana Potion x10'] },
  },
  {
    id: 'dragon-lair',
    name: 'O Despertar dos Dragões',
    levelReq: 35,
    status: 'available',
    category: 'Covis Ancestrais',
    location: 'Dragon Lair de Venore',
    description: 'Criaturas aladas cuspidoras de fogo foram avistadas saindo das fossas terrosas de Venore. Derrote as bestas escarlates e assegure a paz nas rotas comerciais.',
    objectives: [
      { text: 'Encontrar a câmara do Dragão Ancião', done: false },
      { text: 'Derrotar 10 Dragões e 3 Dragon Hatchlings', done: false },
      { text: 'Recuperar uma Dragon Tail intacta', done: false },
    ],
    rewards: { xp: '28.000 XP', gp: '8.000 gp', items: ['Dragon Shield', 'Fire Sword Fragment'] },
  },
  {
    id: 'ancient-blessings',
    name: 'Peregrinação das Bênçãos Divinas',
    levelReq: 10,
    status: 'available',
    category: 'Tradição dos Templos',
    location: '5 Templos Sagrados do Continente',
    description: 'Visite os sacerdotes guardiões nos 5 altares sagrados para receber a proteção espiritual que reduz drasticamente a penalidade de morte.',
    objectives: [
      { text: 'Visitar o Sacerdote da Centelha da Fênix', done: false },
      { text: 'Visitar o Eremita do Abraço da Terra', done: false },
      { text: 'Visitar a Guardiã dos Ventos Espirituais', done: false },
      { text: 'Visitar o Sábio do Fogo Celestial', done: false },
      { text: 'Visitar o Mestre do Sol Solene', done: false },
    ],
    rewards: { xp: '10.000 XP', gp: '10.000 gp', items: ['Bênção Permanente dos 5 Deuses'] },
  },
  {
    id: 'rookie-training',
    name: 'Primeiros Passos de um Aventureiro',
    levelReq: 1,
    status: 'completed',
    category: 'Academia de Combate',
    location: 'Templo de Thais',
    description: 'Aprenda os fundamentos do combate com o instrutor da corte e prepare suas primeiras armas e armaduras.',
    objectives: [
      { text: 'Falar com o Grande Instrutor no Templo', done: true },
      { text: 'Equipar uma arma condizente com sua vocação', done: true },
      { text: 'Alcançar o nível 8', done: true },
    ],
    rewards: { xp: '1.200 XP', gp: '500 gp', items: ['Leather Set Completo', 'Rope & Shovel'] },
  },
];

export function HuntSelector({
  open,
  hunts,
  monsters,
  level,
  currentHuntId,
  isInCity = false,
  isPartyLeader = false,
  initialTab,
  isMobile,
  onClose,
  onSelect,
  onSelectWithTeam,
  onOpenPartyModal,
  onStartTraining,
  onOpenArena,
  onOpenQuests,
  onOpenBosses,
}: Props) {
  const gameModal = useGameModal();
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => initialTab ?? 'CAÇADAS');
  const [view, setView] = useState<ViewMode>('catalog');
  const [selectedHuntId, setSelectedHuntId] = useState<string>(() => hunts[0]?.id ?? 'rat-cellars');
  const [pullSize, setPullSize] = useState<HuntPullSize>('cauteloso');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  // Training state
  const [selectedTrainingSkill, setSelectedTrainingSkill] = useState<string>('Sword Fighting');
  const [selectedQuestId, setSelectedQuestId] = useState<string>('thais-sewers');
  const [trackedQuestId, setTrackedQuestId] = useState<string>('thais-sewers');

  // Favorites in localStorage
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('tibiaweb_favorite_hunts');
      return saved ? new Set(JSON.parse(saved)) : new Set(['troll-camp']);
    } catch {
      return new Set(['troll-camp']);
    }
  });

  // Auto-loot preferences (itemId -> boolean)
  const [autoLootPrefs, setAutoLootPrefs] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tibiaweb_autoloot_preferences');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Auto-sell preferences (itemId -> boolean)
  const [autoSellPrefs, setAutoSellPrefs] = useState<Record<number, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('tibiaweb_autosell_preferences');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync with currentHuntId when opened
  useEffect(() => {
    if (open && currentHuntId) {
      setSelectedHuntId(currentHuntId);
    }
  }, [open, currentHuntId]);

  // Sync activeTab with initialTab whenever modal opens or tab changes
  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Save favorites to localStorage
  const toggleFavorite = (e: React.MouseEvent, huntId: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(huntId)) next.delete(huntId);
      else next.add(huntId);
      try {
        localStorage.setItem('tibiaweb_favorite_hunts', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const toggleAutoLoot = (itemId: number) => {
    setAutoLootPrefs((prev) => {
      const next = { ...prev, [itemId]: prev[itemId] === false ? true : false };
      try {
        localStorage.setItem('tibiaweb_autoloot_preferences', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleAutoSell = (itemId: number) => {
    setAutoSellPrefs((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      try {
        localStorage.setItem('tibiaweb_autosell_preferences', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const selectedHunt = useMemo(() => {
    return hunts.find((h) => h.id === selectedHuntId) ?? hunts[0];
  }, [hunts, selectedHuntId]);

  // Filtered hunts for catalog
  const filteredHunts = useMemo(() => {
    return hunts.filter((hunt) => {
      if (hunt.id === 'pvp-arena') return false; // Handled separately in Arena modal
      if (showOnlyFavorites && !favorites.has(hunt.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = hunt.name.toLowerCase().includes(q) || (hunt.displayName && hunt.displayName.toLowerCase().includes(q));
      const matchDesc = hunt.description && hunt.description.toLowerCase().includes(q);
      const matchMonsters = hunt.monsters.some((m) => m.toLowerCase().includes(q));
      return matchName || matchDesc || matchMonsters;
    });
  }, [hunts, showOnlyFavorites, favorites, searchQuery]);

  // Pull monsters for selected hunt in Screen 2
  const pullMonsters = useMemo(() => {
    if (!selectedHunt) return [];
    return getPullSizeMonsterPool(selectedHunt.id, pullSize, selectedHunt.monsters);
  }, [selectedHunt, pullSize]);

  // Aggregated loot for current pull
  const aggregatedLoot = useMemo(() => {
    const map = new Map<number, { itemId: number; name: string; chance: number }>();
    for (const mId of pullMonsters) {
      const mon = monsters.find((m) => m.id === mId);
      if (mon && Array.isArray(mon.loot)) {
        for (const item of mon.loot) {
          if (item.itemId != null && !map.has(item.itemId)) {
            map.set(item.itemId, {
              itemId: item.itemId,
              name: item.name,
              chance: item.chance ?? 1000,
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Keep gold coin first
      if (a.itemId === 2148) return -1;
      if (b.itemId === 2148) return 1;
      return b.chance - a.chance;
    });
  }, [pullMonsters, monsters]);

  const handleStartHunt = () => {
    if (isPartyLeader && onSelectWithTeam) {
      onSelectWithTeam(selectedHunt.id, selectedHunt.name, pullSize);
    } else {
      onSelect(selectedHunt.id, pullSize);
    }
    onClose();
  };

  const isMobileView = isMobile ?? (typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const tabList: ActiveTab[] = isMobileView
    ? (activeTab === 'TREINO' ? ['CAÇADAS', 'TREINO', 'QUESTS'] : ['CAÇADAS', 'QUESTS'])
    : ['CAÇADAS', 'TREINO', 'QUESTS'];

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
  };

  if (!open) return null;

  return (
    <div
      className="hunt-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="hunt-frame-container"
        role="dialog"
        aria-modal="true"
        aria-label={view === 'catalog' ? 'Organizar caçada' : selectedHunt?.name ?? 'Caçada'}
      >
        {/* Window Title Bar */}
        <div className="hunt-window-titlebar">
          <span className="hunt-window-title">
            {activeTab === 'TREINO'
              ? 'Pátio de Treinamento'
              : activeTab === 'QUESTS'
              ? 'Diário de Missões & Quests'
              : view === 'catalog'
              ? 'Organizar caçada'
              : selectedHunt?.name}
          </span>
          <button
            type="button"
            className="hunt-window-close-btn"
            onClick={onClose}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Top Activity Tabs */}
        <div className="hunt-top-nav-tabs">
          {tabList.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`hunt-top-nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => handleTabClick(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Body: Training or Hunts (Catalog / Setup) */}
        {activeTab === 'TREINO' ? (
          <div className="training-window-body" style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
            <p className="training-window-subtitle" style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '14px' }}>
              Escolha uma habilidade e como treiná-la no pátio de treino da cidade.
            </p>
            <div className="training-skills-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { name: 'Sword Fighting', skill: 'sword', icon: '⚔️', desc: 'Espadas e lâminas corpo a corpo' },
                { name: 'Axe Fighting', skill: 'axe', icon: '🪓', desc: 'Machados de corte pesado' },
                { name: 'Club Fighting', skill: 'club', icon: '🔨', desc: 'Clavas e martelos esmagadores' },
                { name: 'Distance Fighting', skill: 'distance', icon: '🏹', desc: 'Arcos, bestas e lanças' },
                { name: 'Shielding', skill: 'shielding', icon: '🛡️', desc: 'Defesa e bloqueio com escudos' },
                { name: 'Magic Level', skill: 'magicLevel', icon: '✨', desc: 'Poder e capacidade mágica' },
              ].map((item) => {
                const isSelected = selectedTrainingSkill === item.name;
                return (
                  <div
                    key={item.skill}
                    className={`training-skill-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTrainingSkill(item.name)}
                    style={{
                      background: isSelected ? '#27292c' : '#161719',
                      border: `1.5px solid ${isSelected ? '#facc15' : '#2a2c30'}`,
                      borderRadius: '4px',
                      padding: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 0 12px rgba(250, 204, 21, 0.25)' : 'none',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{item.icon}</div>
                    <div style={{ fontWeight: 700, color: isSelected ? '#f3c769' : '#f1f5f9', fontSize: '14px', fontFamily: 'Georgia, serif' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{item.desc}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="hunt-setup-footer-btn"
                onClick={() => setActiveTab('CAÇADAS')}
              >
                Voltar para Caçadas
              </button>
              <button
                type="button"
                className="hunt-start-hunt-btn"
                onClick={() => {
                  onStartTraining?.(selectedTrainingSkill);
                  onClose();
                }}
              >
                Iniciar Treino ({selectedTrainingSkill})
              </button>
            </div>
          </div>
        ) : activeTab === 'QUESTS' ? (
          /* SCREEN: INLINE QUEST LOG VIEW (EM BREVE / RESPONSIVE DARK STONE & GOLD) */
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isMobileView ? '16px 12px' : '32px 20px',
              backgroundColor: '#111315',
              backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(202, 138, 4, 0.08) 0%, transparent 70%)',
            }}
          >
            <div
              style={{
                maxWidth: '560px',
                width: '100%',
                backgroundColor: '#181a1d',
                border: '1px solid #33363a',
                borderRadius: '8px',
                padding: isMobileView ? '20px 14px' : '28px 24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              {/* Glowing Quest Icon */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  border: '2px solid #ca8a04',
                  boxShadow: '0 0 20px rgba(202, 138, 4, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#facc15',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <path d="M8 7h8" />
                  <path d="M8 11h6" />
                </svg>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(234, 179, 8, 0.18)',
                  color: '#fef08a',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                }}
              >
                Em Desenvolvimento · Em Breve
              </div>

              {/* Title & Lore */}
              <div>
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    fontFamily: 'Georgia, serif',
                    fontSize: isMobileView ? '18px' : '22px',
                    fontWeight: 700,
                    color: '#f3c769',
                    letterSpacing: '0.5px',
                  }}
                >
                  Diário de Missões & Quests
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: isMobileView ? '12px' : '13px',
                    color: '#94a3b8',
                    lineHeight: '1.6',
                    maxWidth: '460px',
                  }}
                >
                  As missões canônicas, tarefas narrativas e caçadas lendárias estão sendo elaboradas pelo desenvolvedor. Em breve você poderá aceitar missões de NPCs de Thais, explorar masmorras e conquistar recompensas exclusivas!
                </p>
              </div>

              {/* Upcoming Highlights Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobileView ? '1fr' : 'repeat(3, 1fr)',
                  gap: '10px',
                  width: '100%',
                  marginTop: '4px',
                }}
              >
                <div
                  style={{
                    backgroundColor: '#121416',
                    border: '1px solid #282a2e',
                    borderRadius: '6px',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📜</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>Missões de Thais</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Enredos canônicos e histórias do reino</span>
                </div>
                <div
                  style={{
                    backgroundColor: '#121416',
                    border: '1px solid #282a2e',
                    borderRadius: '6px',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🎒</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>Tarefas de Addons</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>Colete materiais e forje novos visuais</span>
                </div>
                <div
                  style={{
                    backgroundColor: '#121416',
                    border: '1px solid #282a2e',
                    borderRadius: '6px',
                    padding: '12px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🏆</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>RECOMPENSAS AO COMPLETAR</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>XP, Ouro e itens raros de valor</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="hunt-start-hunt-btn"
                onClick={() => setActiveTab('CAÇADAS')}
                style={{
                  marginTop: '6px',
                  padding: '9px 24px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Voltar para as Caçadas
              </button>
            </div>
          </div>
        ) : view === 'catalog' ? (
          /* SCREEN 1: CATALOG VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Subheader bar */}
            <div className="hunt-subheader-bar">
              <span className="hunt-sub-btn" style={{ cursor: 'default' }}>
                ‹ Caçadas
              </span>
              <button
                type="button"
                className={`hunt-sub-btn ${showOnlyFavorites ? 'active-favorite' : ''}`}
                onClick={() => setShowOnlyFavorites((prev) => !prev)}
                title="Filtrar caçadas favoritas"
              >
                ★ Favoritos
              </button>
              <div className="hunt-pill-btn">
                Organizar caçada
              </div>
              <button
                type="button"
                className="hunt-sub-btn"
                onClick={onOpenPartyModal}
                title="Procurar ou formar grupo de caçada"
              >
                Encontrar time
              </button>
            </div>

            {/* Search Bar */}
            <div className="hunt-search-bar-row">
              <div className="hunt-search-input-box">
                <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Buscar caçadas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="hunt-search-counter">
                {filteredHunts.length} caçadas disponíveis
              </div>
            </div>

            {/* 4-Column Grid */}
            <div className="hunt-catalog-grid">
              {filteredHunts.map((hunt) => {
                const primaryMonster = hunt.monsters[0] ?? 'rat';
                const isFav = favorites.has(hunt.id);
                const stats = HUNT_STATS_MAP[hunt.id];
                const monsterNames = hunt.monsters
                  .map((id) => id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
                  .join(', ');

                return (
                  <div
                    key={hunt.id}
                    className="hunt-catalog-card"
                    onClick={() => {
                      setSelectedHuntId(hunt.id);
                      setView('setup');
                    }}
                  >
                    <div className="hunt-card-top">
                      <div className="hunt-card-sprite-box">
                        <img
                          src={`/generated/bestiary/${primaryMonster}.png`}
                          alt={hunt.name}
                          onError={(e) => {
                            const target = e.currentTarget;
                            const stage = target.dataset.triedFallback || '0';
                            if (stage === '0') {
                              target.dataset.triedFallback = '1';
                              target.src = `/generated/tibia1098/monster-${primaryMonster}-thumb.png`;
                            } else if (stage === '1') {
                              target.dataset.triedFallback = '2';
                              target.src = `/generated/tibia1098/monster-${primaryMonster}-south-frame-0.png`;
                            } else if (stage === '2') {
                              target.dataset.triedFallback = '3';
                              target.src = `/assets/monsters/${primaryMonster}.png`;
                            } else if (stage === '3') {
                              target.dataset.triedFallback = '4';
                              target.src = `/images/hunts/hunt-${hunt.id}.png`;
                            } else {
                              target.src = '/generated/bestiary/rat.png';
                            }
                          }}
                        />
                      </div>
                      <div className="hunt-card-info">
                        <div className="hunt-card-title-row">
                          <span className="hunt-card-title">{hunt.name}</span>
                          <span className="hunt-card-lvl-badge">Lv. {hunt.recommendedLevel || 1}+</span>
                        </div>
                        <div className="hunt-card-creatures" title={monsterNames}>{monsterNames}</div>
                      </div>
                      <button
                        type="button"
                        className={`hunt-star-btn ${isFav ? 'is-fav' : ''}`}
                        onClick={(e) => toggleFavorite(e, hunt.id)}
                        title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                      >
                        {isFav ? '★' : '☆'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SCREEN 2: HUNT SETUP & PULL SIZE */
          <div className="hunt-setup-container">
            {/* Mobile-Optimized Setup Header (Onda 5: Menu do Bicho Reorganizado) */}
            <div className="hunt-mobile-setup-header">
              <div className="hunt-mobile-setup-top-row">
                <div className="hunt-mobile-primary-sprite-box">
                  <img
                    src={`/generated/bestiary/${selectedHunt.monsters[0] ?? 'rat'}.png`}
                    alt={selectedHunt.name}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = '/generated/bestiary/rat.png';
                    }}
                  />
                </div>
                <div className="hunt-mobile-pull-selector">
                  <span className="hunt-mobile-section-label">Tamanho do Pull</span>
                  <div className="hunt-pull-size-tabs mobile-tabs">
                    <button
                      type="button"
                      className={`hunt-pull-size-tab ${pullSize === 'cauteloso' ? 'active' : ''}`}
                      onClick={() => setPullSize('cauteloso')}
                    >
                      Cauteloso
                    </button>
                    <button
                      type="button"
                      className={`hunt-pull-size-tab ${pullSize === 'ousado' ? 'active' : ''}`}
                      onClick={() => setPullSize('ousado')}
                    >
                      Ousado
                    </button>
                    <button
                      type="button"
                      className={`hunt-pull-size-tab ${pullSize === 'agressivo' ? 'active' : ''}`}
                      onClick={() => setPullSize('agressivo')}
                    >
                      Agressivo
                    </button>
                  </div>
                </div>
              </div>

              <div className="hunt-mobile-meta-box">
                <div className="hunt-mobile-title-row">
                  <span className="hunt-mobile-title">{selectedHunt.name}</span>
                  <button
                    type="button"
                    className={`hunt-star-btn ${favorites.has(selectedHunt.id) ? 'is-fav' : ''}`}
                    onClick={(e) => toggleFavorite(e, selectedHunt.id)}
                  >
                    {favorites.has(selectedHunt.id) ? '★' : '☆'}
                  </button>
                </div>
                <div className="hunt-mobile-requirements">
                  <span>Mínimo: Lv. {selectedHunt.minimumLevel || 1}</span>
                  <span style={{ color: '#facc15' }}> · Recomendado: Lv. {selectedHunt.recommendedLevel || 1}+</span>
                </div>
                {(selectedHunt.description || selectedHunt.shortDescription) && (
                  <div className="hunt-mobile-desc">
                    {selectedHunt.description || selectedHunt.shortDescription}
                  </div>
                )}
              </div>
            </div>

            {/* Header Banner (Desktop) */}
            <div className="hunt-setup-banner">
              <div>
                <div className="hunt-setup-banner-title">
                  <span>{selectedHunt.name}</span>
                  <button
                    type="button"
                    className={`hunt-star-btn ${favorites.has(selectedHunt.id) ? 'is-fav' : ''}`}
                    onClick={(e) => toggleFavorite(e, selectedHunt.id)}
                  >
                    {favorites.has(selectedHunt.id) ? '★' : '☆'}
                  </button>
                </div>
                <div className="hunt-setup-banner-desc">
                  {selectedHunt.description || selectedHunt.shortDescription}
                </div>
              </div>

              <div className="hunt-setup-record-box">
                <div className="hunt-setup-record-header">
                  <span>Requisitos</span>
                </div>
                <div className="hunt-setup-record-body">
                  <span>Mínimo: Lv. {selectedHunt.minimumLevel || 1}</span>
                  <span style={{ color: '#facc15' }}>Recomendado: Lv. {selectedHunt.recommendedLevel || 1}+</span>
                </div>
              </div>
            </div>

            {/* 2-Column Grid */}
            <div className="hunt-setup-grid-body">
              {/* Left Column: Pull Size & Monsters */}
              <div className="hunt-setup-col">
                <div className="hunt-setup-section-title">Tamanho do pull</div>
                <div className="hunt-pull-size-tabs">
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'cauteloso' ? 'active' : ''}`}
                    onClick={() => setPullSize('cauteloso')}
                  >
                    Cauteloso
                  </button>
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'ousado' ? 'active' : ''}`}
                    onClick={() => setPullSize('ousado')}
                  >
                    Ousado
                  </button>
                  <button
                    type="button"
                    className={`hunt-pull-size-tab ${pullSize === 'agressivo' ? 'active' : ''}`}
                    onClick={() => setPullSize('agressivo')}
                  >
                    Agressivo
                  </button>
                </div>

                <div className="hunt-setup-section-title" style={{ marginTop: '4px' }}>
                  Monstros deste pull ({pullSize === 'cauteloso' ? '2-3 criaturas' : pullSize === 'ousado' ? '4 criaturas' : '5-6 criaturas'})
                </div>

                <div className="hunt-pull-creatures-list">
                  {pullMonsters.map((monsterId) => {
                    const mon = monsters.find((m) => m.id === monsterId);
                    const displayName = mon?.name ?? monsterId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                    return (
                      <div key={monsterId} className="hunt-pull-creature-card">
                        <div className="hunt-pull-creature-sprite-box">
                          <img
                            src={`/generated/bestiary/${monsterId}.png`}
                            alt={displayName}
                            onError={(e) => {
                              const target = e.currentTarget;
                              const stage = target.dataset.triedFallback || '0';
                              if (stage === '0') {
                                target.dataset.triedFallback = '1';
                                target.src = `/generated/tibia1098/monster-${monsterId}-thumb.png`;
                              } else if (stage === '1') {
                                target.dataset.triedFallback = '2';
                                target.src = `/generated/tibia1098/monster-${monsterId}-south-frame-0.png`;
                              } else if (stage === '2') {
                                target.dataset.triedFallback = '3';
                                target.src = `/assets/monsters/${monsterId}.png`;
                              } else {
                                target.src = '/generated/bestiary/rat.png';
                              }
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="hunt-details-btn"
                          onClick={() => gameModal.openCyclopedia('bestiary')}
                          title="Ver detalhes no Bestiário da Cyclopedia"
                        >
                          Detalhes
                        </button>
                        <span className="hunt-pull-creature-name" title={displayName}>
                          {displayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Loot Possível */}
              <div className="hunt-setup-col">
                <div className="hunt-loot-header-row">
                  <span className="hunt-setup-section-title" style={{ margin: 0 }}>Loot possível</span>
                  <div className="hunt-loot-header-actions">
                    <span>PEGAR</span>
                    <span>VENDER</span>
                  </div>
                </div>

                <div className="hunt-loot-scroll-list">
                  {aggregatedLoot.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '11px', textAlign: 'center', padding: '20px 0' }}>
                      Nenhum loot catalogado para este pull.
                    </div>
                  ) : (
                    aggregatedLoot.map((item) => {
                      const isGold = item.itemId === 2148 || item.name.toLowerCase().includes('gold coin');
                      const rarityClass =
                        item.chance >= 50000
                          ? 'comum'
                          : item.chance >= 10000
                          ? 'incomum'
                          : item.chance >= 1000
                          ? 'raro'
                          : 'muito-raro';
                      const rarityLabel =
                        item.chance >= 50000
                          ? 'Comum'
                          : item.chance >= 10000
                          ? 'Incomum'
                          : item.chance >= 1000
                          ? 'Raro'
                          : 'Muito raro';

                      return (
                        <div key={item.itemId} className="hunt-loot-item-row">
                          <div className="hunt-loot-item-left">
                            <div className="hunt-loot-item-sprite-box">
                              <img
                                src={`/generated/cyclopedia/items/item-${item.itemId}.png`}
                                alt={item.name}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.triedFallback) {
                                    target.dataset.triedFallback = '1';
                                    target.src = `/assets/items/item-${item.itemId}.png`;
                                  }
                                }}
                              />
                            </div>
                            <span className="hunt-loot-item-name" title={item.name}>
                              {item.name}
                            </span>
                          </div>

                          <div className="hunt-loot-item-actions">
                            <span className={`hunt-loot-rarity ${rarityClass}`}>
                              {rarityLabel}
                            </span>
                            {isGold ? (
                              <>
                                <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>✓</span>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>—</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="checkbox"
                                  className="hunt-loot-checkbox"
                                  checked={autoLootPrefs[item.itemId] !== false}
                                  onChange={() => toggleAutoLoot(item.itemId)}
                                  title="Pegar item automaticamente"
                                />
                                <input
                                  type="checkbox"
                                  className="hunt-loot-checkbox"
                                  checked={Boolean(autoSellPrefs[item.itemId])}
                                  onChange={() => toggleAutoSell(item.itemId)}
                                  title="Vender item automaticamente na volta à cidade"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Setup Footer */}
            <div className="hunt-setup-footer">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="hunt-setup-footer-btn"
                  onClick={() => setView('catalog')}
                >
                  ‹ Voltar ao catálogo
                </button>
                <button
                  type="button"
                  className="hunt-setup-footer-btn"
                  onClick={onClose}
                >
                  Fechar
                </button>
              </div>

              <button
                type="button"
                className="hunt-start-hunt-btn"
                onClick={handleStartHunt}
              >
                {isPartyLeader ? 'Iniciar com time' : 'Iniciar caçada'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
