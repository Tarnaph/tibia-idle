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

export interface HuntLoadingConfig {
  bgImage: string;
  curiosities: string[];
}

export const DEFAULT_HUNT_LOADING_CONFIG: HuntLoadingConfig = {
  bgImage: '/images/loading/thais-loading.jpg',
  curiosities: THAIS_LORE_CURIOSITIES,
};

export const HUNT_LOADING_CONFIGS: Record<string, HuntLoadingConfig> = {
  'dragon-lair': {
    bgImage: '/images/loading/dragon-lair-loading.jpg',
    curiosities: DRAGON_LAIR_LORE_CURIOSITIES,
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
