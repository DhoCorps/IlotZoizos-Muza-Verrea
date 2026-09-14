import { z } from 'zod';

// Devises et ressources reconnues par la Canopée
export const CurrencyEnum = z.enum([
  'plumes',
  'totamtoes',
  'parchemins',
  'vinyles',
  'sampleNotes',
  'TOX',
  'DHO',
  'KAOS'
]);
export type ICurrency = z.infer<typeof CurrencyEnum>;

export type AssetType = 'TASK' | 'SUJET' | 'PARTITA' | 'SAMPLE' | 'KAOS' | 'EURO' | 'TOX' | 'DHO';

export interface IAssetValue {
  type: AssetType;
  amount: number;
  entityId?: string; // optionnel si c'est une monnaie pure
}

// Niveaux de difficulté
export const DifficultyEnum = z.enum(['Initiate', 'Artisan', 'Maestro']);
export type IDifficulty = z.infer<typeof DifficultyEnum>;

// 🌟 SOURCE UNIQUE DE VÉRITÉ POUR LE MODE DE JEU
export const GameModeEnum = z.enum(['SOLO', 'MULTIPLAYER', 'solo', 'multiplayer']);
export type GameMode = z.infer<typeof GameModeEnum>;

// Schéma du KonTraKt de départ
export const KonTraKtCreationSchema = z.object({
  creatorId: z.string().min(1, "L'UID du créateur est requis"),
  gameId: z.string().min(1, "L'identifiant du jeu est requis"),
  gameMode: GameModeEnum,
  difficulty: DifficultyEnum,
  wagerAmount: z.number().positive("La mise doit être strictement positive"),
  wagerCurrency: CurrencyEnum,
  targetDhOValue: z.number().positive("La valeur cible en DhÔ doit être positive"),
  expiresAt: z.date()
}).refine((data) => {
  if ((data.gameMode === 'solo' || data.gameMode === 'SOLO') && (data.wagerCurrency === 'DHO' || data.wagerCurrency === 'TOX')) {
    return false;
  }
  return true;
}, {
  message: "Les devises souveraines (DhÔ / TôX) sont formellement interdites en mode Solo",
  path: ['wagerCurrency']
});

export type IKonTraKtCreation = z.infer<typeof KonTraKtCreationSchema>;

// Schéma du Panier de Victoire
export const VictoryBasketItemSchema = z.object({
  currency: CurrencyEnum,
  quantity: z.number().positive(),
  unitDhOValue: z.number().positive()
});

export const VictoryBasketSchema = z.object({
  userId: z.string().min(1),
  gameId: z.string().min(1),
  earnedCreditDhO: z.number().nonnegative(),
  selectedItems: z.array(VictoryBasketItemSchema)
}).refine((data) => {
  const totalCost = data.selectedItems.reduce(
    (acc, item) => acc + item.quantity * item.unitDhOValue, 
    0
  );
  return totalCost <= data.earnedCreditDhO;
}, {
  message: "Le coût total du panier sélectionné dépasse le crédit de victoire acquis",
  path: ['selectedItems']
});

export type IVictoryBasket = z.infer<typeof VictoryBasketSchema>;
export type IVictoryBasketItem = z.infer<typeof VictoryBasketItemSchema>;