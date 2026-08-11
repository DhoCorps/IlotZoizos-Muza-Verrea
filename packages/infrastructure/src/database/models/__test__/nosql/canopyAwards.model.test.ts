import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { CanopyAwardModel } from '../../nosql/canopyAward.model';

describe('CanopyAwardModel (Modèle NoSQL - Trophées de la Canopée)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://127.0.0.1:27017/ilotzoizos_test_canopy_award');
    }
    // S'assure que les index composés uniques sont bien initialisés en base
    await CanopyAwardModel.init();
  });

  beforeEach(async () => {
    await CanopyAwardModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('🟢 doit créer et enregistrer un trophée valide avec les valeurs par défaut', async () => {
    const award = await CanopyAwardModel.create({
      yearMonth: '2026-08',
      awardKey: 'MOST_ACTIVE_BIRD',
      title: "La Plume d'Or",
      recipientUid: 'bird_alpha_123',
      loreDescription: 'Celui dont l’encre n’a jamais séché.',
      metadata: { score: 150 }
    });

    expect(award).toBeDefined();
    expect(award.awardKey).toBe('MOST_ACTIVE_BIRD');
    expect(award.category).toBe('GLORY'); // Valeur par défaut
    expect(award.recipientUid).toBe('bird_alpha_123');
    expect(award.metadata.score).toBe(150);
    expect(award.createdAt).toBeDefined();
  });

  it('🔴 doit rejeter la création si les champs requis (yearMonth, awardKey, title, recipientUid) sont absents', async () => {
    let error: any;
    try {
      await CanopyAwardModel.create({
        category: 'CHAOS'
      });
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
  });

  it('🔴 doit empêcher les doublons pour la même combinaison unique yearMonth + awardKey', async () => {
    await CanopyAwardModel.create({
      yearMonth: '2026-08',
      awardKey: 'MASTER_OF_CHAOS',
      title: 'Le Grand Semeur de Bordel',
      recipientUid: 'bird_chaos_1'
    });

    let duplicateError: any;
    try {
      await CanopyAwardModel.create({
        yearMonth: '2026-08',
        awardKey: 'MASTER_OF_CHAOS',
        title: 'Titre différent mais même clé et cycle',
        recipientUid: 'bird_chaos_2'
      });
    } catch (err) {
      duplicateError = err;
    }

    expect(duplicateError).toBeDefined();
    // Erreur MongoDB de clé en double (Code 11000)
    expect(duplicateError.code).toBe(11000);
  });
});