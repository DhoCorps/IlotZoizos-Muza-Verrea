// Fichier : packages/types/src/__tests__/kontrakt.types.test.ts
import { describe, it, expect } from 'vitest';
import { KonTrakTSchema } from '../core/kontrakt.types';

describe('KonTraKt Types & Schemas', () => {
  it('🟢 doit accepter la création d\'un KonTraKt avec une monnaie de base en mode SOLO et coercer la date', () => {
    const isoDate = new Date(Date.now() + 86400000).toISOString(); // +24h en string ISO
    
    const validKonTraKt = {
      creatorId: 'bird_123',
      gameId: 'Morpion',
      gameMode: 'SOLO',
      difficulty: 'Initiate',
      wagerAmount: 10,
      wagerCurrency: 'plumes', // Monnaie valide en solo
      targetDhOValue: 5,
      expiresAt: isoDate // ⏳ String ISO
    };

    const result = KonTrakTSchema.safeParse(validKonTraKt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('pending'); // Valeur par défaut
      expect(result.data.expiresAt).toBeInstanceOf(Date); // ⏳ Vérification coerce
      expect(result.data.expiresAt.toISOString()).toBe(isoDate);
    }
  });

  it('🟢 doit accepter la création d\'un KonTraKt avec DHO ou TOX en mode MULTIPLAYER', () => {
    const validMultiplayerKonTraKt = {
      creatorId: 'bird_456',
      gameId: 'PlumZee',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Maestro',
      wagerAmount: 50,
      wagerCurrency: 'DHO', // Valide car MULTIPLAYER
      targetDhOValue: 50,
      expiresAt: new Date(Date.now() + 86400000)
    };

    const result = KonTrakTSchema.safeParse(validMultiplayerKonTraKt);
    expect(result.success).toBe(true);
  });

  it('🔴 doit bloquer la création d\'un KonTraKt en mode SOLO si la monnaie est DHO ou TOX', () => {
    const invalidSoloKonTraKt = {
      creatorId: 'bird_789',
      gameId: 'PlaJia',
      gameMode: 'SOLO',
      difficulty: 'Artisan',
      wagerAmount: 20,
      wagerCurrency: 'TOX', // 🚨 Interdit en solo !
      targetDhOValue: 10,
      expiresAt: new Date(Date.now() + 86400000)
    };

    const result = KonTrakTSchema.safeParse(invalidSoloKonTraKt);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Vérifie que l'erreur provient bien de notre custom .refine()
      expect(result.error.issues[0].message).toContain("formellement interdites en mode Solo");
      expect(result.error.issues[0].path).toEqual(['wagerCurrency']);
    }
  });

  it('🟢 doit accepter l\'acceptation d\'un KonTraKt avec coverCurrency incluant DHO ou TOX', () => {
    const acceptedKonTraKt = {
      creatorId: 'bird_A',
      gameId: 'CrazyMorpion',
      gameMode: 'MULTIPLAYER',
      difficulty: 'Artisan',
      wagerAmount: 10,
      wagerCurrency: 'totamtoes',
      targetDhOValue: 15,
      status: 'accepted',
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // Test avec ISO string
      acceptedById: 'bird_B',
      coverCurrency: 'TOX', // Oiseau B relève le défi en TOX
      coverAmount: 15
    };

    const result = KonTrakTSchema.safeParse(acceptedKonTraKt);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt).toBeInstanceOf(Date); // ⏳ Vérification supplémentaire
    }
  });
});