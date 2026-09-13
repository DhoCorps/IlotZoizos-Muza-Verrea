export interface CanopyAwardDefinition {
  key: string;
  title: string;
  category: 'GLORY' | 'CHAOS' | 'SYMBIOSIS' | string;
  defaultLore: string;
  evaluator?: (params: { yearMonth: string }) => Promise<string | null>;
}

export const CANOPY_AWARDS_CATALOG: Record<string, CanopyAwardDefinition> = {
  ALCHIMISTE_DE_VALEUR: {
    key: 'ALCHIMISTE_DE_VALEUR',
    title: 'L\'Alchimiste de Valeur',
    category: 'GLORY',
    defaultLore: 'Attribué à l\'Oiseau ayant converti et généré le plus haut volume d\'énergie au cours du cycle.',
    evaluator: async ({ yearMonth }) => {
      // Logique d'évaluation par défaut ou rattachée au KomptaStatsEngine
      return null;
    },
  },
  MECENE_DE_L_AUBE: {
    key: 'MECENE_DE_L_AUBE',
    title: 'Le Mécène de l\'Aube',
    category: 'SYMBIOSIS',
    defaultLore: 'Attribué à l\'Oiseau ayant injecté le plus de sève et soutenu le plus de projets de la canopée.',
    evaluator: async ({ yearMonth }) => {
      return null;
    },
  },
  VOIX_DE_L_ABIME: {
    key: 'VOIX_DE_L_ABIME',
    title: 'La Voix de l\'Abîme',
    category: 'CHAOS',
    defaultLore: 'Attribué à l\'Oiseau dont les échos et monologues ont fait résonner l\'ensemble des nids.',
    evaluator: async ({ yearMonth }) => {
      return null;
    },
  },
  ETINCELLE_SYMBIOTIQUE: {
    key: 'ETINCELLE_SYMBIOTIQUE',
    title: 'L\'Étincelle Symbiotique',
    category: 'SYMBIOSIS',
    defaultLore: 'Attribué à l\'Oiseau le plus réactif et empathique à travers ses interactions.',
    evaluator: async ({ yearMonth }) => {
      return null;
    },
  },
};