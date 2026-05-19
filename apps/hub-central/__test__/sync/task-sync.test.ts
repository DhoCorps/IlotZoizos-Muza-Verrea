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

  // 🛰️ L'Orchestrateur est l'artisan de la mutation
  const orchestrator = new TaskOrchestrator(); 

  // 🛡️ La Signature (L'Aura) pour franchir la Douane de l'Orchestrateur
  const mockSignature = {
    actorUid: TEST_USER_UID,
    capabilities: [CAPABILITIES.TASK.CREATE, '*'], 
    issuedAt: new Date()
  };

  /**
   * 🐘 PRÉPARATION DU NID (Éveil de la Silice et du Graphe)
   */
  beforeAll(async () => {
    await connectToDatabase();
    
    // ✅ SUTURE : On nettoie par UID et par SLUG pour éviter le blocage d'index unique
    const TEST_SLUG = "chantier-seven";
    await ProjectModel.deleteMany({ $or: [{ uid: TEST_PROJECT_UID }, { slug: TEST_SLUG }] });
    
    const project = new ProjectModel({
      uid: TEST_PROJECT_UID,
      name: "Chantier Seven",
      slug: TEST_SLUG, 
      ownerUid: TEST_USER_UID,
      creatorUid: TEST_USER_UID, // 🪡 SUTURE : Ajout du créateur obligatoire pour la validation
      status: "CONCEPT",
    });
    await project.save();

    // 3. Tissage du Graphe Initial (Neo4j)
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
  }, 30000); // 🪡 SUTURE DE TIMEOUT : Marge de 30s pour absorber les latences réseau initiales

  /**
   * 🧹 NETTOYAGE DU NEXUS (Après le vol)
   */
  afterAll(async () => {
    const session = getNeo4jDriver().session();
    try {
      // ✅ SUTURE : Correction syntaxe Neo4j (WITH requis entre les opérations de suppression)
      await session.run(`
        MATCH (t:Task { projectUid: $pUid }) DETACH DELETE t
        WITH $pUid as pUid
        MATCH (p:Project { uid: pUid }) DETACH DELETE p
      `, { pUid: TEST_PROJECT_UID });
    } finally {
      await session.close();
    }

    // Déconnexion de la Silice
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    console.log("🧹 Vallée des ombres nettoyée.");
  }, 30000);

  it('✅ doive synchroniser une nouvelle Tâche entre Mongo et Neo4j', async () => {
    // 🏗️ Préparation de l'Atome (Task)
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

    // 🚀 ACTION : L'Orchestrateur lance la Suture synchronisée
    const newTask = await orchestrator.fosterTask(taskData, mockSignature);
    createdTaskUid = newTask.uid;

    // --- VÉRIFICATIONS OMEGA ---

    // 1. Vérification dans la Silice (MongoDB)
    const mongoTask = await TaskModel.findOne({ uid: createdTaskUid });
    expect(mongoTask).toBeDefined();
    expect(mongoTask?.content.title).toBe(taskData.content.title);
    console.log("💎 Atome trouvé dans la Silice.");

    // 2. Vérification dans le Graphe (Neo4j)
    const session = getNeo4jDriver().session();
    try {
      const neoResult = await session.run(
        'MATCH (t:Task { uid: $uid }) RETURN t',
        { uid: createdTaskUid }
      );
      expect(neoResult.records.length).toBe(1);
      console.log("🔗 Synchronisation Neo4j confirmée.");
    } finally {
      await session.close();
    }
  });
});