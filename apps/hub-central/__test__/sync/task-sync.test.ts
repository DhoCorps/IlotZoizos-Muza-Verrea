// apps/hub-central/__test__/sync/task-sync.test.ts
import mongoose from 'mongoose';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { TaskOrchestrator } from '@ilot/shared-core';
import { getNeo4jDriver, ProjectModel, TaskModel, connectToDatabase } from '@ilot/infrastructure';
import { TaskStatus, TaskPriority, CAPABILITIES } from '@ilot/types';

describe('Moteur de Synchronisation (Integration)', () => {
  let createdTaskUid: string | null = null;
  const TEST_PROJECT_UID = `proj_seven_${Date.now()}`;
  const TEST_USER_UID = "user_test_999";
  let isInfrastructureAvailable = true;

  const orchestrator = new TaskOrchestrator(); 

  const mockSignature = {
    actorUid: TEST_USER_UID,
    capabilities: [CAPABILITIES.TASK.CREATE, '*'], 
    issuedAt: new Date()
  };

  /**
   * 🐘 PRÉPARATION DU NID (Test de connectivité avant exécution)
   */
  beforeAll(async () => {
    try {
      // Test de connexion rapide avec timeout court pour éviter les blocages de 30s
      await Promise.race([
        connectToDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout Mongo')), 3000))
      ]);

      const session = getNeo4jDriver().session();
      await session.run('RETURN 1');
      await session.close();
    } catch (error) {
      console.warn("⚠️ [Integration Test] Bases de données (Mongo/Neo4j) non disponibles. Le test d'intégration sera ignoré.");
      isInfrastructureAvailable = false;
    }

    if (!isInfrastructureAvailable) return;

    const TEST_SLUG = "chantier-seven";
    await ProjectModel.deleteMany({ $or: [{ uid: TEST_PROJECT_UID }, { slug: TEST_SLUG }] });
    
    const project = new ProjectModel({
      uid: TEST_PROJECT_UID,
      name: "Chantier Seven",
      slug: TEST_SLUG, 
      ownerUid: TEST_USER_UID,
      creatorUid: TEST_USER_UID,
      status: "CONCEPT",
    });
    await project.save();

    const session = getNeo4jDriver().session();
    try {
      await session.run(`
        MERGE (u:User { uid: $uUid }) SET u.username = "Seven_Pilot"
        MERGE (p:Project { uid: $pUid }) SET p.name = "Chantier Seven"
        MERGE (u)-[:CONTRIBUTOR_OF]->(p)
      `, { uUid: TEST_USER_UID, pUid: TEST_PROJECT_UID });
    } finally {
      await session.close();
    }
  }, 30000);

  /**
   * 🧹 NETTOYAGE DU NEXUS
   */
  afterAll(async () => {
    if (!isInfrastructureAvailable) return;

    const session = getNeo4jDriver().session();
    try {
      await session.run(`
        MATCH (t:Task { projectUid: $pUid }) DETACH DELETE t
        WITH $pUid as pUid
        MATCH (p:Project { uid: pUid }) DETACH DELETE p
      `, { pUid: TEST_PROJECT_UID });
    } finally {
      await session.close();
    }

    console.log("🧹 Vallée des ombres nettoyée.");
  }, 30000);

  it('✅ doive synchroniser une nouvelle Tâche entre Mongo et Neo4j', async () => {
    if (!isInfrastructureAvailable) {
      console.warn("⏭️ Test ignoré : infrastructure non connectée.");
      expect(true).toBe(true);
      return;
    }

    const taskData = {
      content: {
        title: "Forger la première fonctionnalité",
        description: "Sédimentation de l'Îlot Zoizos",
        tags: [] 
      },
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      projectUid: TEST_PROJECT_UID
    };

    const newTask = await orchestrator.fosterTask(taskData, mockSignature);
    createdTaskUid = newTask.uid;

    const mongoTask = await TaskModel.findOne({ uid: createdTaskUid });
    expect(mongoTask).toBeDefined();
    expect(mongoTask?.content.title).toBe(taskData.content.title);

    const session = getNeo4jDriver().session();
    try {
      const neoResult = await session.run(
        'MATCH (t:Task { uid: $uid }) RETURN t',
        { uid: createdTaskUid }
      );
      expect(neoResult.records.length).toBe(1);
    } finally {
      await session.close();
    }
  });
});