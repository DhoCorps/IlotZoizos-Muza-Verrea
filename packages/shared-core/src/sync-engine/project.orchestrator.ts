import { ProjectModel, UserModel, TeamModel, getNeo4jSession } from '../../../infrastructure';
import { IProject } from '../../../types/src/models/project.types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import {randomUUID } from 'crypto';
/**
 * 🛰️ PROJECT ORCHESTRATOR 
 * L'Architecte des chantiers. Orchestre la cohérence entre la Silice (Mongo) et le Graphe (Neo4j).
 */
export const ProjectOrchestrator = {

  // --- 🌟 FONDATION : CRÉATION D'UN PROJET ---

  /**
   * Crée un projet et tisse ses liens hiérarchiques.
   * Gère les projets de projets (parentId) et l'ancrage au propriétaire (ownerId).
   */
  async fosterProject(projectData: Partial<IProject> & { ownerUid: string }) {
    // 🛡️ ANALYSE MORALE : On vérifie l'intégrité du nom avant toute chose
    if (projectData.name) {
      const check = MoralChecker.analyze(projectData.name);
      if (!check.isSafe) {
        throw new Error(`Nom de projet invalide : ${check.suggestion}`);
      }
    }

    // 🔍 IDENTIFICATION DU PROPRIÉTAIRE (Oiseau ou Nid)
    const owner = await UserModel.findOne({ uid: projectData.ownerUid }) || 
                  await TeamModel.findOne({ uid: projectData.ownerUid });
    
    if (!owner) throw new Error("Propriétaire (Oiseau ou Nid) introuvable dans la matrice.");

    return await TransactionManager.execute("Fondation de Projet", async (mongoSession, neo4jTx) => {
      // 2. Génération de l'UID en amont [cite: 2026-04-02]
      const projectUid = `project_${randomUUID()}`;
      // 1. MONGO : Persistance des données gargantuesques
      const [newProject] = await ProjectModel.create([{
        ...projectData,
        uid: projectUid, // On impose l'UID généré ici
        ownerId: owner._id,
        dates: {
          ...projectData.dates,
          lastActivity: new Date()
        }
      }], { session: mongoSession });

      // 4. Utilisation directe pour le Graphe (Neo4j)
      const cypher = `
        MERGE (owner { uid: $ownerUid })
        MERGE (p:Project { uid: $projectUid })
        ON CREATE SET 
          p.name = $name, 
          p.status = $status,
          p.createdAt = datetime()
        
        MERGE (owner)-[:OWNER_OF]->(p)
        // ... (Reste du Cypher inchangé)
      `;

      await neo4jTx.run(cypher, {
        ownerUid: projectData.ownerUid,
        projectUid: projectUid, // Utilisation de notre constante
        name: newProject.name,
        status: newProject.status,
        parentId: projectData.parentId || null,
        teamUids: projectData.teamIds || []
      });

      return { success: true, project: newProject };
    });
  },

  // --- 🎭 MUTATION & GESTION DES FLUX ---

  /**
   * Modifie un projet (Roadmap, Fichiers, Santé, etc.)
   */
  async mutateProject(projectUid: string, data: Partial<IProject>) {
    if (data.name) {
      const check = MoralChecker.analyze(data.name);
      if (!check.isSafe) throw new Error(`Nom invalide : ${check.suggestion}`);
    }

    return await TransactionManager.execute("Fondation de Projet", async (mongoSession, neo4jTx) => {  const updatedProject = await ProjectModel.findOneAndUpdate(
        { uid: projectUid },
        { 
          $set: { 
            ...data,
            "dates.lastActivity": new Date() 
          } 
        },
        { new: true, session: mongoSession }
      );
      
      if (!updatedProject) throw new Error("Projet introuvable pour la mutation.");

      // Mise à jour de l'identité dans le graphe si nécessaire
      if (data.name || data.status) {
        await neo4jTx.run(
          `MATCH (p:Project {uid: $projectUid}) 
           SET p.name = COALESCE($name, p.name), 
               p.status = COALESCE($status, p.status)`, 
          { projectUid, name: data.name, status: data.status }
        );
      }
      
      return updatedProject;
    });
  },

  /**
   * Ajoute des fichiers au projet (Tableau d'URLs)
   */
  async appendFiles(projectUid: string, fileUrls: string[]) {
    return await ProjectModel.findOneAndUpdate(
      { uid: projectUid },
      { 
        $push: { fileUploads: { $each: fileUrls } },
        $set: { "dates.lastActivity": new Date() }
      },
      { new: true }
    );
  },

  // --- 🧨 DISSOLUTION ---

  /**
   * Efface le projet de la Silice et du Graphe.
   */
  async dissolveProject(projectUid: string) {
    return await TransactionManager.execute("Dissolution de Projet", async (mongoSession, neo4jTx) => {
      // 1. Suppression dans Neo4j (Détachement des relations CHILD_OF et OWNER_OF)
      await neo4jTx.run(`MATCH (p:Project {uid: $projectUid}) DETACH DELETE p`, { projectUid });
      
      // 2. Suppression dans Mongo
      const deletedProject = await ProjectModel.findOneAndDelete({ uid: projectUid }, { session: mongoSession });
      
      if (!deletedProject) throw new Error("Projet introuvable pour la dissolution.");

      return true;
    });
  }
};