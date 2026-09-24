import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { PageViewModel } from '../../nosql/pageView.model';

describe('PageViewModel Test - Télémétrie & Analytics ERP', () => {
  beforeAll(async () => {
    const uri = process.env.MONGO_TEST_URI || 'mongodb://127.0.0.1:27017/ilotzoizos_test';
    await mongoose.connect(uri);
  });

  afterEach(async () => {
    await PageViewModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('🟢 doit enregistrer une visite de page avec succès', async () => {
    const validView = new PageViewModel({
      storeUid: 'store_123',
      visitorUid: 'bird_456',
      path: '/le-bordel-de-dho/store/store_123',
    });

    const savedView = await validView.save();

    expect(savedView._id).toBeDefined();
    expect(savedView.storeUid).toBe('store_123');
    expect(savedView.visitorUid).toBe('bird_456');
    expect(savedView.createdAt).toBeDefined();
  });

  it('🔴 doit échouer si le storeUid ou visitorUid est manquant', async () => {
    const invalidView = new PageViewModel({
      // storeUid manquant
      // visitorUid manquant
      path: '/home',
    });

    let error: any;
    try {
      await invalidView.save();
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.storeUid).toBeDefined();
    expect(error.errors.visitorUid).toBeDefined();
  });

  it('🟢 doit agréger correctement les visiteurs uniques par jour (Comportement ERP)', async () => {
    // Insertion d'un jeu de données de trafic simulant des visites
    await PageViewModel.insertMany([
      { storeUid: 'store_alpha', visitorUid: 'user_1', createdAt: new Date('2026-08-01T10:00:00Z') },
      { storeUid: 'store_alpha', visitorUid: 'user_1', createdAt: new Date('2026-08-01T11:00:00Z') }, // Doublon (même jour, même user)
      { storeUid: 'store_alpha', visitorUid: 'user_2', createdAt: new Date('2026-08-01T14:00:00Z') },
      { storeUid: 'store_alpha', visitorUid: 'user_1', createdAt: new Date('2026-08-02T09:00:00Z') }, // Jour différent
      { storeUid: 'store_beta', visitorUid: 'user_3', createdAt: new Date('2026-08-01T10:00:00Z') }, // Autre boutique
    ]);

    const startDate = new Date('2026-08-01T00:00:00.000Z');
    const endDate = new Date('2026-08-31T23:59:59.000Z');

    // Réplication de la logique d'agrégation de MonthlyStatsOrchestrator
    const aggregation = await PageViewModel.aggregate([
      { 
        $match: { 
          storeUid: 'store_alpha', 
          createdAt: { $gte: startDate, $lt: endDate } 
        } 
      },
      { 
        $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          visitors: { $addToSet: "$visitorUid" }, 
          pageViews: { $sum: 1 } 
        } 
      },
      { $sort: { _id: 1 } }
    ]);

    expect(aggregation).toHaveLength(2); // Trafic réparti sur 2 jours

    // Test du 1er août
    expect(aggregation[0]._id).toBe('2026-08-01');
    expect(aggregation[0].pageViews).toBe(3);
    expect(aggregation[0].visitors).toHaveLength(2); // user_1 et user_2 uniques
    expect(aggregation[0].visitors).toContain('user_1');
    
    // Test du 2 août
    expect(aggregation[1]._id).toBe('2026-08-02');
    expect(aggregation[1].pageViews).toBe(1);
    expect(aggregation[1].visitors).toHaveLength(1);
  });
});