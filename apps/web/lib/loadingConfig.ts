export const THAIS_LORE_CURIOSITIES: string[] = [
  'Você sabia? Thais é considerada a cidade mais antiga de Tibia e foi a primeira cidade do jogo.',
  'Antes de se chamar Thais, o local era conhecido como Tradespot, um pequeno posto comercial que cresceu até se tornar a capital do reino.',
  'O nome Thais vem de um guerreiro. Após sua morte defendendo Tradespot dos orcs, seu filho Tibianus I renomeou a cidade em homenagem ao pai.',
];

export const DRAGON_LAIR_LORE_CURIOSITIES: string[] = [
  'Todos os dragões descendem de Garsharak, o Primeiro Dragão, uma criatura nascida da dor de Brog e transformada em uma chama viva.',
  'Segundo antigos registros, os dragões estão entre as primeiras criaturas de Tibia e, em tempos remotos, chegaram a dominar grande parte do continente. Hoje, seus descendentes vivem principalmente escondidos em cavernas.',
  'Um antigo livro afirma que os poderosos Dragon Lords possuem uma inesperada paixão por cogumelos e muitos deles carregavam misteriosos livros marcados com uma grande letra “T”',
];

export const CYCLOPS_LORE_CURIOSITIES: string[] = [
  'Os Ciclopes são criaturas brutais e corpulentas de um só olho, conhecidos por sua prodigiosa força física e forjas subterrâneas.',
  'Diz a tradição que os antigos ferreiros Ciclopes moldaram maças, machados e armaduras pesadas nas profundezas de Mount Sternum e das colinas ao sul de Thais.',
  'Apesar de lentos ao caminhar, os golpes pesados de um Cyclops podem facilmente quebrar escudos de aventureiros desprevenidos.',
];

export const ELF_LORE_CURIOSITIES: string[] = [
  'Os Elfos são uma das raças mais ancestrais de Tibia, dotados de extrema destreza, visão apurada e harmonia com a natureza.',
  'Sociedades élficas dividem-se em castas de batedores velozes (Scouts), arcanistas elementais (Arcanists) e soldados de elite guardiões de santuários sagrados.',
  'As flechas disparadas por mestres elfos quase nunca erram o alvo, combinando veneno floral com rajadas mágicas penetrantes.',
];

export const PVP_ARENA_LORE_CURIOSITIES: string[] = [
  'A Arena é o palco sagrado onde guerreiros de todo o reino se enfrentam para provar bravura e maestria tática.',
  'Cada vitória nas batalhas ranqueadas concede +20 pontos de liga. A cada 250 pontos, uma nova patente de caveira é desbloqueada!',
  'Todos os combatentes recebem 100 Health Potions e 100 Mana Potions durante o combate para duelos justos e intensos.',
];

export const SPIDER_BURROW_LORE_CURIOSITIES: string[] = [
  'As aranhas tecem teias densas e grudentas na escuridão das cavernas ao redor de Thais e Rookgaard.',
  'Cuidado ao pisar em seus ninhos subterrâneos: as Poison Spiders injetam um veneno persistente em aventureiros desprevenidos.',
  'Teias de aranha resistentes são muito valorizadas por alfaiates e mestres tecelões por todo o continente.',
];

export const RAT_CELLARS_LORE_CURIOSITIES: string[] = [
  'Os esgotos e porões de Thais estão repletos de roedores vorazes e agressivos.',
  'Aventureiros iniciantes costumam treinar suas primeiras armas nas galerias subterrâneas contra ratos de caverna.',
  'Dizem que queijos velhos atraem ninhadas inteiras diretamente das tocas mais escuras.',
];

export interface HuntLoadingConfig {
  bgImage: string;
  curiosities: string[];
}

export const DEFAULT_HUNT_LOADING_CONFIG: HuntLoadingConfig = {
  bgImage: '/images/loading/thais-loading.jpg',
  curiosities: THAIS_LORE_CURIOSITIES,
};

export const HUNT_LOADING_CONFIGS: Record<string, HuntLoadingConfig> = {
  'spider-burrow': {
    bgImage: '/images/hunts/spider-burrow.jpg',
    curiosities: SPIDER_BURROW_LORE_CURIOSITIES,
  },
  'rat-cellars': {
    bgImage: '/images/hunts/rat-cellars.jpg',
    curiosities: RAT_CELLARS_LORE_CURIOSITIES,
  },
  'dragon-lair': {
    bgImage: '/images/loading/dragon-lair-loading.jpg',
    curiosities: DRAGON_LAIR_LORE_CURIOSITIES,
  },
  'cyclops-camp': {
    bgImage: '/images/loading/cyclops-camp-loading.jpg',
    curiosities: CYCLOPS_LORE_CURIOSITIES,
  },
  'elf-sanctuary': {
    bgImage: '/images/loading/elf-sanctuary-loading.jpg',
    curiosities: ELF_LORE_CURIOSITIES,
  },
  'pvp-arena': {
    bgImage: '/images/loading/thais-loading.jpg',
    curiosities: PVP_ARENA_LORE_CURIOSITIES,
  },
};

/**
 * Returns the loading screen configuration (background image and rotating lore curiosities)
 * for a specific hunt. Any hunt not yet explicitly configured falls back to Thais configuration.
 */
export function getLoadingConfigForHunt(huntId?: string | null): HuntLoadingConfig {
  if (huntId && HUNT_LOADING_CONFIGS[huntId]) {
    return HUNT_LOADING_CONFIGS[huntId];
  }
  return DEFAULT_HUNT_LOADING_CONFIG;
}
