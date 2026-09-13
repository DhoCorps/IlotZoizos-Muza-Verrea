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

  it('🟢 doit sédimenter un sample complet avec sa signature cryptographique', async () => {
    const validSample = {
      uid: 'samp_999',
      title: 'Kick Lourd',
      slug: 'kick-lourd',
      audioUrl: 'https://cdn.ilot/kick.wav',
      storageKey: 'hub-central/fr/projects/samp_999/kick.wav',
      tempoBpm: 120,
      musicalKey: 'C minor',
      style: 'Techno',
      creatorUid: 'bird_dj',
      creatorSlug: 'dj-bird',
      digitalSignature: 'abc123hashcrypto',
      permissions: {
        allowRadio: true,
        allowBlindTest: true,
        allowShowcase: false
      }
    };

    const createdSample = await SampleModel.create(validSample);

    expect(createdSample._id).toBeDefined();
    expect(createdSample.uid).toBe('samp_999');
    expect(createdSample.digitalSignature).toBe('abc123hashcrypto');
    expect(createdSample.copyrightClaimed).toBe(true); // Valeur par défaut
    expect(createdSample.permissions.allowShowcase).toBe(false);
  });

  it('🔴 doit lever une erreur si la signature cryptographique (digitalSignature) manque', async () => {
    const invalidSample = {
      uid: 'samp_888',
      title: 'Snare',
      slug: 'snare',
      audioUrl: 'https://cdn.ilot/snare.wav',
      storageKey: 'snare.wav',
      tempoBpm: 90,
      musicalKey: 'A minor',
      style: 'LoFi',
      creatorUid: 'bird_dj',
      creatorSlug: 'dj-bird',
      // digitalSignature est manquant !
    };

    let error: any;
    try {
      await SampleModel.create(invalidSample);
    } catch (err) {
      error = err;
    }

    expect(error).toBeDefined();
    expect(error.errors.digitalSignature).toBeDefined();
  });
});