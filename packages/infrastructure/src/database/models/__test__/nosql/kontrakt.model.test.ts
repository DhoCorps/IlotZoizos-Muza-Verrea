import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { KonTraKt } from '../../nosql/kontrakt.model';

describe('KonTraKt Model Test Suite', () => {
  beforeAll(async () => {
    // Connexion à une base de données en mémoire pour les tests
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_db');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await KonTraKt.deleteMany({});
  });

  it('devrait créer et sauvegarder un KonTraKt valide', async () => {
    const validKonTraKt = new KonTraKt({
      creatorId: 'oiseau_123',
      gameId: 'plajia_lvl_1',
      gameMode: 'multiplayer',
      difficulty: 'Artisan',
      wagerAmount: 3,
      wagerCurrency: 'plumes',
      targetDhOValue: 3.5,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h
    });

    const savedDoc = await validKonTraKt.save();
    
    expect(savedDoc._id).toBeDefined();
    expect(savedDoc.status).toBe('pending'); // Vérifie la valeur par défaut
    expect(savedDoc.gameMode).toBe('multiplayer');
    expect(savedDoc.targetDhOValue).toBe(3.5);
  });

  it('devrait échouer si un champ requis est manquant', async () => {
    const invalidKonTraKt = new KonTraKt({
      creatorId: 'oiseau_123',
      // gameId manquant
      wagerAmount: 3
    });

    let err: unknown;
    try {
      await invalidKonTraKt.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
  });

  it('devrait rejeter une mise (wagerAmount) négative ou nulle', async () => {
    const negativeWagerDoc = new KonTraKt({
      creatorId: 'oiseau_123',
      gameId: 'plajia_lvl_1',
      gameMode: 'multiplayer',
      difficulty: 'Initiate',
      wagerAmount: -5, // Invalide
      wagerCurrency: 'totamtoes',
      targetDhOValue: 5,
      expiresAt: new Date()
    });

    let err: unknown;
    try {
      await negativeWagerDoc.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect((err as mongoose.Error.ValidationError).errors.wagerAmount).toBeDefined();
  });
});