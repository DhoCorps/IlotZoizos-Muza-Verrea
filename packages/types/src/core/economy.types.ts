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

// Niveaux de difficulté et modes de jeu
export const DifficultyEnum = z.enum(['Initiate', 'Artisan', 'Maestro']);
export type IDifficulty = z.infer<typeof DifficultyEnum>;

export const GameModeEnum = z.enum(['solo', 'multiplayer']);
export type IGameMode = z.infer<typeof GameModeEnum>;

// Schéma du KonTraKt de départ (avec règle Solo vs Multijoueur)
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
  // En mode Solo, interdiction formelle de parier des devises souveraines (DhÔ / TôX)
  if (data.gameMode === 'solo' && (data.wagerCurrency === 'DHO' || data.wagerCurrency === 'TOX')) {
    return false;
  }
  return true;
}, {
  message: "Les devises souveraines (DhÔ / TôX) sont formellement interdites en mode Solo",
  path: ['wagerCurrency']
});

export type IKonTraKtCreation = z.infer<typeof KonTraKtCreationSchema>;

// Schéma de sélection du Panier de Victoire (Post-game loot builder)
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
  // Calcul du coût total du panier composé
  const totalCost = data.selectedItems.reduce(
    (acc, item) => acc + item.quantity * item.unitDhOValue, 
    0
  );
  // La sélection ne peut pas dépasser le crédit acquis (arrondi inférieur)
  return totalCost <= data.earnedCreditDhO;
}, {
  message: "Le coût total du panier sélectionné dépasse le crédit de victoire acquis",
  path: ['selectedItems']
});

export type IVictoryBasket = z.infer<typeof VictoryBasketSchema>;
export type IVictoryBasketItem = z.infer<typeof VictoryBasketItemSchema>;