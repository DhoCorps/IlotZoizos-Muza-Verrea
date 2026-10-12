// Fichier : packages/types/src/__tests__/economy.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  CurrencyEnum,
  AssetTypeEnum,
  AssetValueSchema,
  KonTraKtCreationSchema,
  VictoryBasketSchema
} from '../core/economy.types';

describe('Schémas Zod : Économie, KonTraKt & Panier de Victoire (economy.types.ts)', () => {
  it('🟢 doit valider les devises (CurrencyEnum) et les actifs hybrides (AssetTypeEnum)', () => {
    expect(CurrencyEnum.safeParse('plumes').success).toBe(true);
    expect(CurrencyEnum.safeParse('DHO').success).toBe(true);
    expect(AssetTypeEnum.safeParse('TASK').success).toBe(true);
    expect(AssetTypeEnum.safeParse('PARTITA').success).toBe(true);
    expect(AssetTypeEnum.safeParse('EURO').success).toBe(true);

    const validAsset = AssetValueSchema.safeParse({
      type: 'SAMPLE',
      amount: 3,
      entityId: 'smp_001'
    });
    expect(validAsset.success).toBe(true);
  });

  it('🟢 doit valider un KonTraKt en mode MULTIPLAYER avec une devise souveraine (DHO)', () => {
    const validMultiplayerKontrakt = {
      creatorId: 'bird_001',
      gameId: 'CrazyMorpion',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Maestro',
      wagerAmount: 10,
      wagerCurrency: 'DHO',
      targetDhOValue: 20,
      expiresAt: new Date(Date.now() + 3600_000)
    };

    const result = KonTraKtCreationSchema.safeParse(validMultiplayerKontrakt);
    expect(result.success).toBe(true);
  });

  it('🔴 doit rejeter un KonTraKt en mode SOLO si la mise est en DHO ou TOX', () => {
    const invalidSoloKontrakt = {
      creatorId: 'bird_001',
      gameId: 'PlumZee',
      gameMode: 'SOLO',
      difficulty: 'Artisan',
      wagerAmount: 5,
      wagerCurrency: 'TOX',
      targetDhOValue: 10,
      expiresAt: new Date(Date.now() + 3600_000)
    };

    const result = KonTraKtCreationSchema.safeParse(invalidSoloKontrakt);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('formellement interdites en mode Solo');
    }
  });

  it('🟢 doit valider un Panier de Victoire (VictoryBasketSchema) lorsque le coût total respecte le crédit acquis', () => {
    const validBasket = {
      userId: 'bird_001',
      gameId: 'WikiOracle',
      earnedCreditDhO: 50,
      selectedItems: [
        { currency: 'plumes', quantity: 2, unitDhOValue: 10 },
        { currency: 'vinyles', quantity: 1, unitDhOValue: 25 }
      ]
    };

    expect(VictoryBasketSchema.safeParse(validBasket).success).toBe(true);
  });

  it('🔴 doit rejeter un Panier de Victoire si le coût total dépasse earnedCreditDhO', () => {
    const excessiveBasket = {
      userId: 'bird_001',
      gameId: 'WikiOracle',
      earnedCreditDhO: 30,
      selectedItems: [
        { currency: 'parchemins', quantity: 4, unitDhOValue: 10 } // 40 > 30
      ]
    };

    const result = VictoryBasketSchema.safeParse(excessiveBasket);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('dépasse le crédit de victoire acquis');
    }
  });
});