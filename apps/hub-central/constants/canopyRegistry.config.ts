// packages/shared-core/src/config/canopyRegistry.config.ts

export interface AppSpecificTrophyDefinition {
  id: string;
  title: string;
  appModule: 'samplotek' | 'letrin' | 'poetrik' | 'games' | 'marketplace';
  metricType: 'FIRST_CREATION' | 'MOST_SOLD' | 'TOTAL_VOLUME' | 'HIGHEST_PRICE' | 'LOWEST_PRICE' | 'AVERAGE_PRICE' | 'CUSTOM_SCORE';
  description: string;
  rewardCurrency: 'TOX' | 'DHO';
  rewardAmount: number;
}

export const CANOPY_REGISTRY = {
  // 🏆 Trophées et Distinctions classés par Application / Jeu
  appTrophies: [
    // --- SAMPLOTEK (Studio Audio & Marché d'échantillons) ---
    {
      id: 'samplotek_first_sample',
      title: 'Le Premier Souffle',
      appModule: 'samplotek',
      metricType: 'FIRST_CREATION',
      description: 'Récompensant la création du tout premier échantillon de l’artiste.',
      rewardCurrency: 'TOX',
      rewardAmount: 50,
    },
    {
      id: 'samplotek_best_seller',
      title: 'Le Sample d’Or (Le plus vendu)',
      appModule: 'samplotek',
      metricType: 'MOST_SOLD',
      description: 'Attribué à l’échantillon ayant totalisé le plus grand nombre de ventes sur l’Îlot.',
      rewardCurrency: 'DHO',
      rewardAmount: 200,
    },
    {
      id: 'samplotek_high_roller',
      title: 'L’Œuvre de Luxe',
      appModule: 'samplotek',
      metricType: 'HIGHEST_PRICE',
      description: 'Attribué pour la vente de l’échantillon au prix le plus élevé de la saison.',
      rewardCurrency: 'DHO',
      rewardAmount: 150,
    },

    // --- LETR'IN (Typographie & Design) ---
    {
      id: 'letrin_first_glyph',
      title: 'La Première Ligne',
      appModule: 'letrin',
      metricType: 'FIRST_CREATION',
      description: 'Pour la naissance de la première police ou du premier sprite.',
      rewardCurrency: 'TOX',
      rewardAmount: 50,
    },

    // --- GAMES (Nexus des Jeux) ---
    {
      id: 'games_golden_falcon',
      title: 'Le Faucon d’Or',
      appModule: 'games',
      metricType: 'CUSTOM_SCORE',
      description: 'Le meilleur score historique du mois dans le Nexus des Jeux.',
      rewardCurrency: 'DHO',
      rewardAmount: 100,
    }
  ] as AppSpecificTrophyDefinition[],
};