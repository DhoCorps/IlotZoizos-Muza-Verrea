import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { SystemPurgeJobModel } from '../nosql/systemPurgeJob.model';

describe('SystemPurgeJobModel (Modèle NoSQL - File de Purge Asynchrone)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://127.0.0.1:27017/ilotzoizos_test_purge_jobs');
    }
    await SystemPurgeJobModel.init();
  });

  beforeEach(async () => {
    await SystemPurgeJobModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('🟢 doit créer une tâche de purge avec les valeurs par défaut', async () => {
    const job = await SystemPurgeJobModel.create({
      entityId: 'target_entity_123',
      reason: 'VOLUNTARY_EXILE',
      actorUid: 'bird_admin_1',
      capabilities: ['ROLE_SOVEREIGN']
    });

    expect(job).toBeDefined();
    expect(job.status).toBe('PENDING');
    expect(job.entityId).toBe('target_entity_123');
    expect(job.capabilities).toContain('ROLE_SOVEREIGN');
  });
});