// packages/infrastructure/src/database/models/__test__/nosql/sample.model.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SampleModel } from '../../nosql/sample.model';

describe('Modèle NoSQL - SampleModel (SamploTek)', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await SampleModel.deleteMany({});
  });

  it('🟢 doit sédimenter un sample complet avec son Sceau Cryptographique unifié (cryptoSeal) et ses modules', async () => {
    const validSample = {
      uid: 'samp_999',
      title: 'Kick Lourd',
      slug: 'kick-lourd',
      audioUrl: 'https://cdn.ilot/kick.wav',
      storageKey: 'hub-central/fr/projects/samp_999/kick.wav',
      tempoBpm: 120,
      musicalKey: 'C minor',
      style: 'Techno',
      authorUid: 'bird_dj',
      authorPseudo: 'dj-bird',
      permissions: {
        allowRadio: true,
        allowBlindTest: true,
        allowShowcase: false
      },
      cryptoSeal: {
        digitalSignature: 'abc123hashcrypto',
        timestampedAt: new Date(),
        copyrightMetadata: {
          role: 'CREATOR',
          isExclusiveIlot: true,
          license: 'STANDARD'
        }
      }
    };

    const createdSample = await SampleModel.create(validSample);

    expect(createdSample._id).toBeDefined();
    expect(createdSample.uid).toBe('samp_999');
    
    // Vérification du Sceau
    expect(createdSample.cryptoSeal?.digitalSignature).toBe('abc123hashcrypto');
    expect(createdSample.cryptoSeal?.copyrightMetadata?.role).toBe('CREATOR');
    
    // Vérification de la Modération et du Statut (Valeurs par défaut)
    expect(createdSample.moderation?.isQuarantined).toBe(false);
    expect(createdSample.status).toBe('PUBLISHED');
    expect(createdSample.permissions?.allowShowcase).toBe(false);
  });

  it('🔴 doit lever une erreur si des champs obligatoires (ex: audioUrl) manquent', async () => {
    const invalidSample = {
      uid: 'samp_888',
      title: 'Snare',
      slug: 'snare',
      // audioUrl est manquant !
      storageKey: 'snare.wav',
      tempoBpm: 90,
      musicalKey: 'A minor',
      style: 'LoFi',
      authorUid: 'bird_dj',
      authorPseudo: 'dj-bird',
    };

    let error: any;
    try {
      await SampleModel.create(invalidSample);
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.audioUrl).toBeDefined();
  });
});