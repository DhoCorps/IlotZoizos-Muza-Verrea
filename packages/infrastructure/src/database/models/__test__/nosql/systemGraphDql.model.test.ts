import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { SystemGraphDlqModel } from '@ilot/infrastructure';

describe('SystemGraphDlqModel (Modèle NoSQL - Dead Letter Queue)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://127.0.0.1:27017/ilotzoizos_test_dlq');
    }
    await SystemGraphDlqModel.init();
  });

  beforeEach(async () => {
    await SystemGraphDlqModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('🟢 doit créer et enregistrer une entrée DLQ avec les valeurs par défaut', async () => {
    const dlqEntry = await SystemGraphDlqModel.create({
      operationName: 'Mutation de Test',
      errorPayload: 'Neo4j connection timeout'
    });

    expect(dlqEntry).toBeDefined();
    expect(dlqEntry.operationName).toBe('Mutation de Test');
    expect(dlqEntry.errorPayload).toBe('Neo4j connection timeout');
    expect(dlqEntry.status).toBe('PENDING_RETRY');
    expect(dlqEntry.retryCount).toBe(0);
    expect(dlqEntry.timestamp).toBeDefined();
  });

  it('🔴 doit accepter les différents statuts et mettre à jour le retryCount', async () => {
    const dlqEntry = await SystemGraphDlqModel.create({
      operationName: 'Opération en échec critique',
      errorPayload: 'Deadlock detected',
      status: 'PENDING_RETRY',
      retryCount: 2
    });

    dlqEntry.status = 'FAILED_PERMANENTLY';
    dlqEntry.retryCount = 3;
    const updated = await dlqEntry.save();

    expect(updated.status).toBe('FAILED_PERMANENTLY');
    expect(updated.retryCount).toBe(3);
  });
});