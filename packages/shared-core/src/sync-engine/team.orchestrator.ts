import { TeamModel, UserModel, getNeo4jSession } from '@ilot/infrastructure';
import { ITeam } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import { randomUUID } from 'crypto';

/**
 * 🛰️ TEAM ORCHESTRATOR 
 * L'Architecte des liens. Assure la cohérence entre Mongo et Neo4j.
 */
export const TeamOrchestrator = {

  // --- 🌟 FONDATION : CRÉATION DU NID ---

  async fosterTeam(teamData: { 
    name: string, 
    creatorUid: string, 
    description?: string,
    parentId?: string,
    category: string; 
    nuances: string[]; 
    isPrivate: boolean;
  }) {
    // 🛡️ SUTURE VITEST : Vérification morale
    const check = MoralChecker.analyze(teamData.name);
    if (!check.isSafe) {
      throw new Error(`Nom invalide : ${check.suggestion}`);
    }

    const creator = await UserModel.findOne({ uid: teamData.creatorUid });
    if (!creator) throw new Error("Créateur introuvable dans la canopée.");

    let parentObjectId = null;
    if (teamData.parentId) {
      const parentTeam = await TeamModel.findOne({ uid: teamData.parentId });
      if (!parentTeam) throw new Error("L'escouade parente n'existe pas.");
      parentObjectId = parentTeam._id;
    }

    // 2. Génération de l'UID en amont
    const teamUid = `team_${randomUUID()}`;

    return await TransactionManager.execute("Fondation d'Escouade", async (mongoSession, neo4jTx) => {
      // 3. MONGO : Utilisation de l'UID généré
      const [newTeam] = await TeamModel.create([{
        uid: teamUid, // On injecte l'UID ici
        name: teamData.name,
        description: teamData.description,
        ownerId: creator._id,
        leaderId: creator._id,
        parentId: parentObjectId 
      }], { session: mongoSession });

      await UserModel.findByIdAndUpdate(
        creator._id,
        { $push: { teams: newTeam._id } }, 
        { session: mongoSession }
      );

      // 4. NEO4J : Tissage avec le même UID
      const cypher = `
        MERGE (u:User { uid: $creatorUid })
        ON CREATE SET u.username = $creatorName
        MERGE (t:Team { uid: $teamUid })
        ON CREATE SET t.name = $name, t.createdAt = datetime()
        MERGE (u)-[r:MEMBER_OF]->(t)
        SET r.role = 'ADMIN', r.since = datetime()
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
        teamUid: teamUid, // Utilisation de notre constante
        name: newTeam.name,
        parentId: teamData.parentId || null
      });

      return { success: true, team: newTeam };
    });
  },
  // --- 🤝 RECRUTEMENT DYNAMIQUE (FUSIONNÉ) ---

  /**
   * 🔍 Chercher les oiseaux qui acceptent les invitations
   */
  async getRecruitableBirds(search: string = "") {
    return await UserModel.find({
      isAvailableForTeamRequest: true, // Respect du flag de l'oiseau
      username: { $regex: search, $options: 'i' }
    })
    .select('uid username signature bio')
    .limit(10)
    .lean();
  },

  /**
   * 📨 Envoyer une invitation (Marquage Neo4j)
   */
  async inviteBird(teamUid: string, targetUserUid: string) {
    const target = await UserModel.findOne({ uid: targetUserUid });
    if (!target || !target.isAvailableForTeamRequest) {
      throw new Error("Cet oiseau n'est pas disponible pour un recrutement.");
    }

    return await TransactionManager.execute("Invitation d'Oiseau", async (_, neo4jTx) => {
      const cypher = `
        MATCH (u:User { uid: $targetUserUid })
        MATCH (t:Team { uid: $teamUid })
        MERGE (u)-[r:INVITED_TO]->(t)
        SET r.invitedAt = datetime()
        RETURN u.username as name
      `;
      const result = await neo4jTx.run(cypher, { targetUserUid, teamUid });
      return result.records[0]?.get('name');
    });
  },

  // --- 🎭 MUTATION & DISSOLUTION ---

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

  async dissolveTeam(teamUid: string) {
    return await TransactionManager.execute("Dissolution de Nid", async (mongoSession, neo4jTx) => {
      await neo4jTx.run(`MATCH (t:Team {uid: $teamUid}) DETACH DELETE t`, { teamUid });
      
      const deletedTeam = await TeamModel.findOneAndDelete({ uid: teamUid }, { session: mongoSession });
      
      if (deletedTeam) {
        await UserModel.updateMany(
          { teams: deletedTeam._id },
          { $pull: { teams: deletedTeam._id } },
          { session: mongoSession }
        );
      }
      return true;
    });
  }
};