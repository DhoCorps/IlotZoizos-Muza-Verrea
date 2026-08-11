// packages/types/src/economy/betting.types.ts

export type AssetType = 'TASK' | 'SUJET' | 'PARTITA' | 'SAMPLE' | 'KAOS' | 'EURO' | 'TOX' | 'DHO';

export interface IAssetValue {
  type: AssetType;
  amount: number;
  entityId?: string; // optionnel si c'est une monnaie pure
}

export interface IBettorResult {
  userId: string;
  gameId: string;
  betAssets: IAssetValue[];    // Ce que l'oiseau mise
  winnings: IAssetValue[];     // Ce que l'oiseau espère obtenir
  multiplier: number;
  status: 'PENDING' | 'WON' | 'LOST';
  timestamp: Date;
}