export interface AwardDefinition {
  key: string;
  title: string;
  category: 'GLORY' | 'CHAOS' | 'MYSTIC' | 'CUSTOM';
  defaultLore: string;
  // Fonction de calcul ou de sélection personnalisée si le trophée a une logique unique
  evaluator?: (cycleData: any) => Promise<string | null>; // Retourne l'UID du vainqueur
}

export const CANOPY_AWARDS_CATALOG: Record<string, AwardDefinition> = {
  MOST_ACTIVE_BIRD: {
    key: 'MOST_ACTIVE_BIRD',
    title: 'La Plume d\'Or (Le plus actif)',
    category: 'GLORY',
    defaultLore: 'Celui dont l\'encre n\'a jamais séché durant tout le cycle.'
  },
  MASTER_OF_CHAOS: {
    key: 'MASTER_OF_CHAOS',
    title: 'Le Grand Semeur de Bordel',
    category: 'CHAOS',
    defaultLore: 'Parce que l\'ordre établi est un ennemi de la poésie.'
  },
  SILENT_OBSERVER: {
    key: 'SILENT_OBSERVER',
    title: 'L\'Ombre de la Canopée',
    category: 'MYSTIC',
    defaultLore: 'Il n\'a presque rien dit, mais il a tout vu.'
  }
  // 🦅 -> POUR AJOUTER UN NOUVEAU TROPHÉE DEMAIN : 
  // Il suffit juste d'ajouter une entrée ici ! Zéro modification de schéma nécessaire.
};