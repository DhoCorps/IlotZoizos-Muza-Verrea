import { TeamModel, UserModel, getNeo4jSession } from '@ilot/infrastructure';
import { ITeam } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';

/**
 * 🛰️ TEAM ORCHESTRATOR 
 * Le Forgeur de Nids. Assure la cohérence entre le document (Mongo) et le lien (Neo4j).
 */
export const TeamOrchestrator = {

  // 🌟 FONDATION : Création d'une escouade avec double-ancrage
  async fosterTeam(teamData: { 
    name: string, 
    creatorUid: string, 
    description?: string,
    parentId?: string,
    category: string; 
    nuances: string[]; 
    isPrivate: boolean;
  }) {
    // 🛡️ Vérification morale avant d'entrer dans la matrice
    const check = MoralChecker.analyze(teamData.name);
    if (!check.isSafe) throw new Error(`Nom invalide : ${check.suggestion}`);

    const creator = await UserModel.findOne({ uid: teamData.creatorUid });
    if (!creator) throw new Error("Créateur introuvable.");

    let parentObjectId = null;
    if (teamData.parentId) {
      const parentTeam = await TeamModel.findOne({ uid: teamData.parentId });
      if (!parentTeam) throw new Error("L'escouade parente n'existe pas.");
      parentObjectId = parentTeam._id;
    }

    return await TransactionManager.execute("Fondation d'Escouade", async (mongoSession, neo4jTx) => {
      // 1. MONGO : Création du nid
      const [newTeam] = await TeamModel.create([{
        name: teamData.name,
        description: teamData.description,
        ownerId: creator._id,
        leaderId: creator._id,
        parentId: parentObjectId 
      }], { session: mongoSession });

      // Liaison du nid au créateur dans Mongo
      await UserModel.findByIdAndUpdate(
        creator._id,
        { $push: { teams: newTeam._id } }, 
        { session: mongoSession }
      );

      // 2. NEO4J : Tissage des liens sociaux
      const cypher = `
        MERGE (u:User { uid: $creatorUid })
        ON CREATE SET u.username = $creatorName
        
        MERGE (t:Team { uid: $teamUid })
        ON CREATE SET t.name = $name, t.createdAt = datetime()
        
        MERGE (u)-[r:MEMBER_OF]->(t)
        ON CREATE SET r.role = 'ADMIN', r.since = datetime()
        
        WITH t
        OPTIONAL MATCH (p:Team { uid: $parentId })
        FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t)-[:CHILD_OF]->(p)
        )
        RETURN count(t)
      `;

      await neo4jTx.run(cypher, {
        creatorUid: teamData.creatorUid,
        creatorName: creator.username, 
        teamUid: newTeam.uid,
        name: newTeam.name,
        parentId: teamData.parentId || null
      });

      return { success: true, team: newTeam };
    });
  },

  // 🎭 MUTATION : Mise à jour sécurisée du nid
  async mutateTeam(teamUid: string, data: Partial<ITeam>) {
    if (data.name) {
      const check = MoralChecker.analyze(data.name);
      if (!check.isSafe) throw new Error(`Nom invalide : ${check.suggestion}`);
    }

    return await TransactionManager.execute("Mutation de Nid", async (mongoSession, neo4jTx) => {
      const updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: teamUid },
        { $set: data },
        { new: true, session: mongoSession }
      );
      
      if (!updatedTeam) throw new Error("Nid introuvable pour la mutation.");

      if (data.name) {
        await neo4jTx.run(
          `MATCH (t:Team {uid: $teamUid}) SET t.name = $name`, 
          { teamUid, name: data.name }
        );
      }
      return updatedTeam;
    });
  },

  // 🌋 DISSOLUTION : Désintégration totale et propre
  async dissolveTeam(teamUid: string) {
    return await TransactionManager.execute("Dissolution de Nid", async (mongoSession, neo4jTx) => {
      // 1. Suppression Neo4j (Détachement des liens)
      await neo4jTx.run(`MATCH (t:Team {uid: $teamUid}) DETACH DELETE t`, { teamUid });
      
      // 2. Suppression Mongo
      const deletedTeam = await TeamModel.findOneAndDelete({ uid: teamUid }, { session: mongoSession });
      
      if (deletedTeam) {
        // Nettoyage des références chez tous les utilisateurs
        await UserModel.updateMany(
          { teams: deletedTeam._id },
          { $pull: { teams: deletedTeam._id } },
          { session: mongoSession }
        );
      }
      
      return true;
    });
  },

  // 🎖️ RÔLES : Promotion et Assignation (Désormais sous transaction !)
  async assignRole(teamUid: string, targetUserUid: string, role: string, permissions: string[] = []) {
    return await TransactionManager.execute("Assignation de Rôle", async (mongoSession, neo4jTx) => {
      const cypher = `
        MATCH (u:User { uid: $userUid })
        MATCH (t:Team { uid: $teamUid })
        MERGE (u)-[r:MEMBER_OF]->(t)
        SET r.role = $role, 
            r.permissions = $permissions, 
            r.since = coalesce(r.since, datetime())
        RETURN r.role AS assignedRole, r.permissions AS assignedPermissions
      `;
      const result = await neo4jTx.run(cypher, { userUid: targetUserUid, teamUid, role, permissions });
      
      if (result.records.length === 0) throw new Error("Impossible de lier l'oiseau.");
      
      return { 
        success: true, 
        role: result.records[0].get('assignedRole'), 
        permissions: result.records[0].get('assignedPermissions') 
      };
    });
  },

  // 🚪 MEMBRES : Expulsion sécurisée
  async removeMember(teamUid: string, targetUserUid: string, requesterUid: string) {
    if (targetUserUid === requesterUid) {
      throw new Error("🔒 Sécurité : Un oiseau ne peut pas s'expulser lui-même du nid.");
    }

    return await TransactionManager.execute("Bannissement d'Oiseau", async (mongoSession, neo4jTx) => {
      const cypher = `
        MATCH (u:User {uid: $targetUserUid})-[r:MEMBER_OF]->(t:Team {uid: $teamUid})
        DELETE r
        RETURN coalesce(u.username, 'Inconnu') AS birdName
      `;
      const result = await neo4jTx.run(cypher, { targetUserUid, teamUid });
      
      if (result.records.length === 0) throw new Error("Impossible de bannir : oiseau introuvable.");

      // Optionnel : Retirer l'ID de l'équipe du tableau teams de l'utilisateur dans Mongo
      const targetUser = await UserModel.findOne({ uid: targetUserUid });
      const team = await TeamModel.findOne({ uid: teamUid });
      if (targetUser && team) {
        await UserModel.findByIdAndUpdate(targetUser._id, { $pull: { teams: team._id } }, { session: mongoSession });
      }

      return result.records[0].get('birdName');
    });
  },

  // 📖 LECTURES (Hors transaction pour plus de vitesse)
  async getTeamDetails(teamUid: string) {
    const team = await TeamModel.findOne({ uid: teamUid }).lean();
    if (!team) throw new Error("Ce nid n'existe pas ou a été détruit.");

    const session = getNeo4jSession();
    try {
      const cypher = `
        MATCH (u:User)-[r:MEMBER_OF]->(t:Team {uid: $teamUid})
        RETURN coalesce(u.uid, u.mongodbId) as uid, u.username as username, r.role as role, r.permissions as permissions
      `;
      const result = await session.run(cypher, { teamUid });
      
      const members = await Promise.all(result.records.map(async (record: any) => {
        const birdUid = record.get('uid');
        const mongoUser = await UserModel.findOne({ uid: birdUid }).select('email').lean();
        return {
          uid: birdUid,
          username: record.get('username') || 'Oiseau Fantôme',
          email: mongoUser?.email || "email.inconnu@ilot.fr",
          role: record.get('role'),
          permissions: record.get('permissions') || [] 
        };
      }));

      return { ...team, members };
    } finally {
      await session.close();
    }
  }
};