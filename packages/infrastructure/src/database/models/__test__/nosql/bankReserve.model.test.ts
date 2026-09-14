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
    const reserve1 = new BankReserve({ currency: 'vinyles', totalAmount: 100, equilibriumThreshold: 1000 });
    await reserve1.save();

    const reserve2 = new BankReserve({ currency: 'vinyles', totalAmount: 50, equilibriumThreshold: 1000 });
    
    let err: any;
    try {
      await reserve2.save();
    } catch (error) {
      err = error;
    }
    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Code d'erreur MongoDB pour duplication d'index unique
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