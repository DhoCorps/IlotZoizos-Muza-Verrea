// packages/shared-core/src/sync-engine/team.orchestrator.ts
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { ProjectModel } from '@ilot/infrastructure/src/database/models/nosql/project.model';
import { TaskModel } from '@ilot/infrastructure/src/database/models/nosql/task.model';
import { ITeam, CAPABILITIES, ActionSignature } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface TeamSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

/**
 * 🛰️ TEAM ORCHESTRATOR 
 * L'Architecte des liens. Assure la coherence entre la Silice (Mongo) et le Graphe (Neo4j).
 */
export class TeamOrchestrator {
  async fosterTeam(
    teamData: { 
      name: string, 
      description?: string,
      parentId?: string | null;
      category: string; 
      frequency?: string; 
      isPrivate: boolean; 
      ownerUid: string;
      leaderUid: string | null;
    },
    signature: ActionSignature
  ): Promise<TeamSyncResult> {
        
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.CREATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour fonder une escouade", "FORBIDDEN", 403);
    }
    
    const moralCheck = new MoralChecker();
    const check = moralCheck.analyze(teamData.name);
    if (!check.isSafe) throw new IlotError(`Nom invalide : ${check.suggestion}`, "BAD_REQUEST", 400);

    const creator = await OiseauModel.findOne({ uid: signature.actorUid });
    if (!creator) throw new IlotError("Empreinte créatrice introuvable dans la canopée.", "NOT_FOUND", 404);

    const teamUid = `team_${randomUUID()}`;
    const defaultFreq = teamData.frequency || '#2A3B4C';

    return await TransactionManager.execute("Fondation d'Escouade", async (mongoSession, neo4jTx) => {
      const [newTeam] = await TeamModel.create([{
        uid: teamUid, 
        name: teamData.name,
        description: teamData.description,
        category: teamData.category,
        frequency: defaultFreq,
        isPrivate: teamData.isPrivate,
        ownerUid: creator.uid,
        leaderUid: creator.uid,
        parentId: teamData.parentId || null
      }], { session: mongoSession });

      await OiseauModel.findOneAndUpdate(
        { uid: creator.uid },
        { $push: { teams: newTeam._id } }, 
        { session: mongoSession }
      );

      const founderCapabilities = [
        ...Object.values(CAPABILITIES.TEAM),
        ...Object.values(CAPABILITIES.MEMBER),
        ...Object.values(CAPABILITIES.PROJECT)
      ];

      const cypher = `
        MERGE (u:User { uid: $actorUid })
        MERGE (t:Team { uid: $teamUid })
        ON CREATE SET 
          t.createdAt = datetime(),
          t.frequency = $frequency,
          t.isPrivate = $isPrivate,
          t.category = $category

        MERGE (u)-[:FOUNDED]->(t)
        MERGE (u)-[r:MEMBER_OF]->(t)
        SET r.since = datetime(), 
            r.capabilities = $capabilities
        
        with t
        OPTIONAL MATCH (p:Team { uid: $parentId })
        FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t)-[:CHILD_OF]->(p)
        )
        RETURN t
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        teamUid: teamUid, 
        parentId: teamData.parentId || null,
        frequency: defaultFreq,
        isPrivate: teamData.isPrivate,
        category: teamData.category,
        capabilities: founderCapabilities
      });

      return { 
        success: true, 
        status: 'success', 
        mongo: newTeam, 
        neo4j: neoResult 
      };
    });
  }

  async getRecruitableBirds(search: string = "") {
    return await OiseauModel.find({
      isOpenToInvitations: true, 
      pseudo: { $regex: search, $options: 'i' }
    }).select('uid pseudo frequenceHEX capabilities bio').limit(10).lean();
  }

  async inviteBird(
    data: { teamUid?: string; teamIdentifier?: string; targetUserUid: string; capabilities?: string[] },
    signature: ActionSignature
  ) {
    const identifier = data.teamIdentifier || data.teamUid;
    const team = await TeamModel.findOne({ $or: [{ uid: identifier }, { slug: identifier }] });
    if (!team) {
      throw new IlotError("Ce Nid n'existe pas dans la Silice.", "NOT_FOUND", 404);
    }

    const isNestOwner = team.ownerUid === signature.actorUid;
    const hasGlobalPower = signature.capabilities.includes(CAPABILITIES.MEMBER.INVITE) || 
                           signature.capabilities.includes('*');

    if (!isNestOwner && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour recruter dans ce Nid.", "FORBIDDEN", 403);
    }

    const target = await OiseauModel.findOne({ uid: data.targetUserUid });
    if (!target) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Invitation d'Oiseau", async (mongoSession, neo4jTx) => {
      const cypher = `
        MERGE (target:User { uid: $targetUserUid })
        ON CREATE SET target.pseudo = $pseudo, target.frequenceHEX = $hex
        
        WITH target
        MATCH (t:Team { uid: $teamUid })
        
        OPTIONAL MATCH (target)-[oldRefuse:REFUSED_INVITATION]->(t)
        DELETE oldRefuse
        
        WITH target, t
        MERGE (target)-[r:INVITED_TO]->(t)
        SET r.invitedAt = datetime(),
            r.capabilities = $caps
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, { 
        targetUserUid: data.targetUserUid, 
        pseudo: target.pseudo,
        hex: target.frequenceHEX,
        teamUid: team.uid,
        caps: data.capabilities || [CAPABILITIES.PROJECT.READ, CAPABILITIES.TASK.CREATE] 
      });

      return { success: true, status: 'success', mongo: target, neo4j: neoResult };
    });
  }

  async mutateTeam(
    teamIdentifier: string, 
    data: Partial<ITeam>, 
    signature: ActionSignature
  ): Promise<TeamSyncResult> {
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Action interdite par la matrice.", "FORBIDDEN", 403);
    }

    if (data.name) {
      const moralCheck = new MoralChecker();
      const check = moralCheck.analyze(data.name);
      if (!check.isSafe) throw new IlotError(`Nom invalide : ${check.suggestion}`, "BAD_REQUEST", 400);
    }

    const existingTeam = await TeamModel.findOne({ $or: [{ uid: teamIdentifier }, { slug: teamIdentifier }] });
    if (!existingTeam) throw new IlotError("Nid introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Mutation de Nid", async (mongoSession, neo4jTx) => {
      const updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: existingTeam.uid }, { $set: data }, { new: true, session: mongoSession }
      ).lean();
      
      let neoResult = null;
      if (data.frequency !== undefined || data.isPrivate !== undefined || data.name !== undefined) {
        neoResult = await neo4jTx.run(
          `MATCH (t:Team {uid: $teamUid}) SET t.frequency = $freq, t.isPrivate = $priv, t.name = coalesce($name, t.name) RETURN t`,
          { 
            teamUid: existingTeam.uid, 
            freq: data.frequency ?? updatedTeam!.frequency, 
            priv: data.isPrivate ?? updatedTeam!.isPrivate,
            name: data.name ?? null
          }
        );
      }
      
      return { 
        success: true, 
        status: 'success', 
        mongo: updatedTeam, 
        neo4j: neoResult 
      };
    });
  }

  async dissolveTeam(teamIdentifier: string, signature: ActionSignature): Promise<boolean> {
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.DELETE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour dissoudre ce Nid.", "FORBIDDEN", 403);
    }

    const team = await TeamModel.findOne({ $or: [{ uid: teamIdentifier }, { slug: teamIdentifier }] });
    if (!team) throw new IlotError("Nid introuvable.", "NOT_FOUND", 404);

    const teamUid = team.uid;

    return await TransactionManager.execute("Dissolution de Nid", async (mongoSession, neo4jTx) => {
      const projects = await ProjectModel.find({ ownerUid: teamUid }).session(mongoSession);
      const projectUids = projects.map(p => p.uid);
      const tasks = await TaskModel.find({ projectUid: { $in: projectUids } }).session(mongoSession);

      for (const task of tasks) {
        if (task.documents) {
          for (const doc of task.documents) {
            try { await storageService.deleteFile(storageService.extractKeyFromUrl(doc.url)); } catch {}
          }
        }
      }
      for (const project of projects) {
        if (project.documents) {
          for (const doc of project.documents) {
            try { await storageService.deleteFile(storageService.extractKeyFromUrl(doc.url)); } catch {}
          }
        }
      }

      if (projectUids.length > 0) {
        await TaskModel.deleteMany({ projectUid: { $in: projectUids } }, { session: mongoSession });
        await ProjectModel.deleteMany({ ownerUid: teamUid }, { session: mongoSession });
      }

      const deletedTeam = await TeamModel.findOneAndDelete({ uid: teamUid }, { session: mongoSession });
      if (deletedTeam) {
        await OiseauModel.updateMany({ teams: deletedTeam._id }, { $pull: { teams: deletedTeam._id } }, { session: mongoSession });
      }

      if (projectUids.length > 0) {
        await neo4jTx.run(`MATCH (tk:Task) WHERE tk.projectUid IN $projectUids DETACH DELETE tk`, { projectUids });
        await neo4jTx.run(`MATCH (p:Project) WHERE p.uid IN $projectUids DETACH DELETE p`, { projectUids });
      }
      await neo4jTx.run(`MATCH (t:Team {uid: $teamUid}) DETACH DELETE t`, { teamUid });

      return true;
    });
  }

  async leaveTeam(
    teamIdentifier: string,
    userUid: string,
    mode: 'CLEAN' | 'TRACE',
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    if (signature.actorUid !== userUid) {
      throw new IlotError("Tu ne peux pas forcer l'envol d'un autre oiseau via cette route.", "FORBIDDEN", 403);
    }

    const team = await TeamModel.findOne({ $or: [{ uid: teamIdentifier }, { slug: teamIdentifier }] });
    if (!team) throw new IlotError("Nid introuvable dans la Silice.", "NOT_FOUND", 404);
    
    if (team.ownerUid === userUid) {
      throw new IlotError("L'Architecte ne peut pas abandonner son propre Nid. Dissous-le ou transmets sa clé.", "BAD_REQUEST", 400);
    }

    const teamUid = team.uid;

    return await TransactionManager.execute("L'Envol Volontaire", async (mongoSession, neo4jTx) => {
      
      if (mode === 'CLEAN') {
        const cypherClean = `
          MATCH (u:User) WHERE u.uid = $userUid OR u.slug = $userUid
          MATCH (t:Team {uid: $teamUid})
          MATCH (u)-[r:MEMBER_OF|INVITED_TO|REFUSED_INVITATION]->(t)
          
          OPTIONAL MATCH (t)-[:HAS_PROJECT]->(pAll:Project)<-[:TASK_OF]-(tk:Task)
          WHERE tk.creatorUid = $userUid
          WITH r, t, collect(DISTINCT tk) AS userTasks
          
          OPTIONAL MATCH (t)-[:HAS_PROJECT]->(pUser:Project)
          WHERE pUser.creatorUid = $userUid
          
          OPTIONAL MATCH (pUser)<-[:TASK_OF]-(tkOrphan:Task)
          WITH r, userTasks, collect(DISTINCT pUser) AS userProjects, collect(DISTINCT tkOrphan) AS orphanTasks
          
          FOREACH (task IN userTasks | DETACH DELETE task)
          FOREACH (orphan IN orphanTasks | DETACH DELETE orphan)
          FOREACH (proj IN userProjects | DETACH DELETE proj)
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(cypherClean, { userUid, teamUid });

        const projects = await ProjectModel.find({ ownerUid: teamUid }).session(mongoSession).lean();
        const projectUids = projects.map(p => p.uid);

        if (projectUids.length > 0) {
          await TaskModel.deleteMany({ 
            projectUid: { $in: projectUids }, 
            creatorUid: userUid 
          }).session(mongoSession);
        }

        const userProjects = await ProjectModel.find({ ownerUid: teamUid, creatorUid: userUid }).session(mongoSession).lean();
        const userProjectUids = userProjects.map(p => p.uid);

        if (userProjectUids.length > 0) {
          await TaskModel.deleteMany({ projectUid: { $in: userProjectUids } }).session(mongoSession);
          await ProjectModel.deleteMany({ ownerUid: teamUid, creatorUid: userUid }).session(mongoSession);
        }

      } else {
        const cypherTrace = `
          MATCH (u:User) WHERE u.uid = $userUid OR u.slug = $userUid
          MATCH (t:Team {uid: $teamUid})
          MATCH (u)-[r:MEMBER_OF|INVITED_TO|REFUSED_INVITATION]->(t)
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(cypherTrace, { userUid, teamUid });
      }

      await OiseauModel.findOneAndUpdate(
        { uid: userUid },
        { $pull: { teams: team._id } },
        { session: mongoSession }
      );

      return {
        success: true,
        message: mode === 'CLEAN' 
          ? "Vous avez quitté le Nid en emportant toutes vos plumes. Vos traces sont effacées."
          : "Vous avez repris votre vol libre. Vos Atomes restent gravés dans l'histoire du Nid."
      };
    });
  }
}