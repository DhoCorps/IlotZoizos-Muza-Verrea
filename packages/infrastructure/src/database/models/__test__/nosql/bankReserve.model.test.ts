import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest';
import mongoose from 'mongoose';
import { BankReserve } from '../../nosql/bankReserve.model';

describe('BankReserve Model Test Suite', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_db');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await BankReserve.deleteMany({});
  });

  it('🟢 devrait créer une réserve et calculer correctement le wealthIndex (Indice > 1.0)', async () => {
    const reserve = new BankReserve({
      currency: 'totamtoes',
      totalAmount: 15000,
      equilibriumThreshold: 10000 // Le seuil d'équilibre idéal
    });

    const savedReserve = await reserve.save();
    
    expect(savedReserve._id).toBeDefined();
    expect(savedReserve.currency).toBe('totamtoes');
    // Vérification du calcul virtuel : 15000 / 10000 = 1.5
    expect(savedReserve.wealthIndex).toBe(1.5); 
  });

  it('🟢 devrait calculer correctement un wealthIndex de crise (Indice < 1.0)', async () => {
    const reserve = new BankReserve({
      currency: 'plumes',
      totalAmount: 200,
      equilibriumThreshold: 1000
    });

    const savedReserve = await reserve.save();
    
    // La ressource est rare, l'indice chute, ce qui rendra les gains futurs plus difficiles
    expect(savedReserve.wealthIndex).toBe(0.2); 
  });

  it('🔴 devrait échouer si l\'on tente de créer deux réserves pour la même devise (Unicité)', async () => {
    // 🛠️ CORRECTION : On utilise une devise valide de l'enum ('plumes') au lieu de 'KOSMIC'
    await BankReserve.create({ currency: 'plumes', totalAmount: 1000, equilibriumThreshold: 500 });
    await BankReserve.syncIndexes(); // Force la création de l'index unique en base de test

    let err: any;
    try {
      await BankReserve.create({ currency: 'plumes', totalAmount: 500, equilibriumThreshold: 500 });
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    // Selon la version de Mongoose ou le pilote, l'erreur d'index dupliqué peut remonter 
    // soit via l'objet d'erreur MongoDB (err.code === 11000) soit via une ValidationError Mongoose.
    // On s'assure qu'une erreur est bien levée pour bloquer le doublon.
    expect(err.code === 11000 || err.name === 'MongoServerError' || err.errors).toBeTruthy();
  });

  it('🔴 devrait rejeter un montant total négatif (Pas de découvert)', async () => {
    const negativeReserve = new BankReserve({
      currency: 'parchemins',
      totalAmount: -500, // Invalide
      equilibriumThreshold: 1000
    });

    let err: any;
    try {
      await negativeReserve.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.totalAmount).toBeDefined();
  });
});