import mongoose from 'mongoose';
import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { TaskOrchestrator } from '../../../../packages/shared-core';
import { getNeo4jDriver, ProjectModel, TaskModel } from '../../../../packages/infrastructure';
import { TaskStatus, TaskPriority } from '../../../../packages/types';

describe('Moteur de Synchronisation (Integration)', () => {
  let createdTaskUid: string | null = null;
  const TEST_PROJECT_UID = `proj_seven_${Date.now()}`;
  const TEST_USER_UID = "user_test_999";

  /**
   * 🧪 PRÉPARATION DU NID (Alchimie du Mercure)
   */
  beforeAll(async () => {
    const URI_AUTH = "mongodb://admin:password1234@127.0.0.1:27017/ilot_zoizos_test?authSource=admin&replicaSet=rs0";
    process.env.MONGODB_URI = URI_AUTH;

    // 1. Déconnexion propre de toute session précédente
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // 2. Connexion et attente explicite de l'ouverture
    await mongoose.connect(URI_AUTH);
    
    // 3. Sécurité : On attend que Mongoose soit en mode 'connected' (readyState 1)
    if (mongoose.connection.readyState !== 1) {
       await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    }

    console.log("🐘 La Silice est éveillée.");

    // 4. Diagnostic d'Autorité (maintenant que db est garanti)
    const status = await mongoose.connection.db!.admin().command({ connectionStatus: 1 });
    console.log("👤 Autorité confirmée pour :", status.authInfo.authenticatedUsers);

    // 5. Préparation du terrain
    await ProjectModel.deleteMany({ uid: TEST_PROJECT_UID });
    const project = new ProjectModel({
      uid: TEST_PROJECT_UID,
      name: "Chantier de Test Seven",
      ownerId: TEST_USER_UID, 
      status: 'ACTIVE',
      dates: { createdAt: new Date(), updatedAt: new Date() }
    });
    await project.save();

    const session = getNeo4jDriver().session();
    try {
      await session.run(`
        MERGE (u:User { uid: $uUid }) SET u.username = "Seven_Pilot", u.status = 'Libre'
        MERGE (p:Project { uid: $pUid }) SET p.name = "Chantier Seven", p.status = 'ACTIVE'
      `, { uUid: TEST_USER_UID, pUid: TEST_PROJECT_UID });
      console.log("✅ Nexus Graphe ancré.");
    } finally {
      await session.close();
    }
  });

  /**
   * 🐣 L'ENVOL (Le Test de Double-Suture) - C'est ce qu'il manquait !
   */
  it('doit propager la création d\'une tâche dans le Nexus (Mongo + Neo4j)', async () => {
    const mockTask = { 
      projectUid: TEST_PROJECT_UID, 
      creatorUid: TEST_USER_UID,
      content: { 
        title: "Suture Système Alpha",
        description: "Vérification de la double-suture",
        tags: ["alchimie", "mercure"]
      },
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH
    };
    
    // Action de l'Orchestrateur
    const result = await TaskOrchestrator.fosterTask(mockTask as any);
    createdTaskUid = result.uid;

    // --- VÉRIFICATION : LA SILICE (MongoDB) ---
    // --- VÉRIFICATION : LA SILICE (MongoDB) ---
    // On glisse un "as any" pour dire au compilateur d'arrêter ses hypothèses sur FlattenMaps
    const mongoTask = await TaskModel.findOne({ uid: result.uid }).lean() as any;
    
    expect(mongoTask?.status).toBe(TaskStatus.TODO);
    console.log("✅ Atome vérifié dans la Silice :", mongoTask?.status);
    // --- VÉRIFICATION : LE GRAPHE (Neo4j) ---
    const session = getNeo4jDriver().session();
    try {
      const cypher = `
        MATCH (u:User { uid: $uUid })-[:CREATED]->(t:Task { uid: $tUid })-[:TASK_OF]->(p:Project { uid: $pUid })
        RETURN t
      `;
      const graphResult = await session.run(cypher, { 
        pUid: TEST_PROJECT_UID, 
        tUid: result.uid, 
        uUid: TEST_USER_UID 
      });

      if (graphResult.records.length === 0) {
        console.error("🌌 Empty Sky : L'oiseau n'a pas pu s'ancrer dans le Graphe.");
      } else {
        console.log("🔍 Oiseau repéré dans le Graphe ! Suture confirmée.");
      }

      expect(graphResult.records.length).toBe(1);
    } finally {
      await session.close();
    }
  });

  /**
   * 🧹 NETTOYAGE DU NID
   */
  afterAll(async () => {
    try {
      // On ne tente le nettoyage que si on est toujours connecté
      if (mongoose.connection.readyState === 1) {
        if (createdTaskUid) await TaskOrchestrator.disintegrateTask(createdTaskUid);
        await ProjectModel.deleteOne({ uid: TEST_PROJECT_UID });
      }
      
      const session = getNeo4jDriver().session();
      try {
        await session.run(`MATCH (p:Project { uid: $uid }) DETACH DELETE p`, { uid: TEST_PROJECT_UID });
        await session.run(`MATCH (u:User { uid: $uUid }) DETACH DELETE u`, { uUid: TEST_USER_UID });
      } finally {
        await session.close();
      }
    } catch (err: any) {
      console.warn("⚠️ Nettoyage partiel :", err.message);
    } finally {
      const driver = getNeo4jDriver();
      if (driver) await driver.close();
      await mongoose.disconnect();
      console.log("🧹 Nexus refermé.");
    }
  });
});