import { OiseauModel, TeamModel, ProjectModel, TaskModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ITeam } from '@ilot/types';
import { CAPABILITIES, ActionSignature } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { syncUniversalInteraction } from '@ilot/infrastructure';

interface IStorageManager {
  deleteFile(key: string): Promise<any>;
  extractKeyFromUrl(url: string): string;
}

export interface TeamSyncResult {
  uid: string;
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

/**
 * 🛰️ TEAM ORCHESTRATOR 
 * Assure la cohérence entre la Silice (Mongo) et le Graphe (Neo4j) avec index stricts (Phase 2).
 */
export class TeamOrchestrator {
  private storageService: IStorageManager;

  constructor(customStorageService?: IStorageManager) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }

  // 🛡️ Résolution canonique interne encapsulée et sécurisée via findEntityBySlugOrUid
  private async resolveCanonicalUserUid(identifier: string): Promise<string> {
    const user = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!user) throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    return (user as any).uid;
  }

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

    // 🚀 PROBLÈMES 2 & SYNCHRO : Résolution unique et globale de l'utilisateur canonique (évite le double aller-retour)
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);
    const creator = await findEntityBySlugOrUid(OiseauModel, actorCanonicalUid) as any;
    if (!creator) throw new IlotError("Empreinte créatrice introuvable dans la canopée.", "NOT_FOUND", 404);

    const teamUid = `team_${randomUUID()}`;
    const defaultFreq = teamData.frequency || '#2A3B4C';

    return await TransactionManager.execute("Fondation d'Escouade", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const [newTeam] = await TeamModel.create([{
        uid: teamUid, 
        name: teamData.name,
        description: teamData.description,
        category: teamData.category,
        frequency: defaultFreq,
        isPrivate: teamData.isPrivate,
        ownerUid: creator.uid,
        leaderUid: creator.uid,
        parentId: teamData.parentId || null,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      }], { session: mongoSession });

      await OiseauModel.findOneAndUpdate(
        { uid: creator.uid },
        { 
          $push: { teams: newTeam._id },
          $set: { 'dates.updatedAt': now }
        }, 
        { session: mongoSession }
      );

      const founderCapabilities = [
        ...Object.values(CAPABILITIES.TEAM),
        ...Object.values(CAPABILITIES.MEMBER),
        ...Object.values(CAPABILITIES.PROJECT)
      ];

      const cypher = `
        MATCH (u:User { uid: $actorUid })
        MERGE (t:Team { uid: $teamUid })
        ON CREATE SET 
          t.createdAt = datetime($now),
          t.updatedAt = datetime($now),
          t.frequency = $frequency,
          t.isPrivate = $isPrivate,
          t.category = $category

        MERGE (u)-[:FOUNDED]->(t)
        MERGE (u)-[r:MEMBER_OF]->(t)
        SET r.since = datetime($now), 
            r.capabilities = $capabilities
        
        with t
        OPTIONAL MATCH (p:Team { uid: $parentId })
        FOREACH (_ IN CASE WHEN p IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t)-[:CHILD_OF]->(p)
        )
        RETURN t
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: creator.uid,
        teamUid: teamUid, 
        parentId: teamData.parentId || null,
        frequency: defaultFreq,
        isPrivate: teamData.isPrivate,
        category: teamData.category,
        capabilities: founderCapabilities,
        now: now.toISOString()
      });

      return { 
        uid: teamUid,        
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

  /**
   * 💌 INVITATION D'UN OISEAU DANS LE NID
   */
  async inviteBird(
    data: { teamUid?: string; teamIdentifier?: string; targetUserUid: string; capabilities?: string[] },
    signature: ActionSignature
  ) {
    const identifier = data.teamIdentifier || data.teamUid;
    const team = await findEntityBySlugOrUid(TeamModel, identifier!) as any;
    if (!team) {
      throw new IlotError("Ce Nid n'existe pas dans la Silice.", "NOT_FOUND", 404);
    }

    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);
    const isNestOwner = team.ownerUid === actorCanonicalUid;
    const hasGlobalPower = signature.capabilities.includes(CAPABILITIES.MEMBER.INVITE) || 
                           signature.capabilities.includes('*');

    if (!isNestOwner && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour recruter dans ce Nid.", "FORBIDDEN", 403);
    }

    const targetCanonicalUid = await this.resolveCanonicalUserUid(data.targetUserUid);
    const target = await findEntityBySlugOrUid(OiseauModel, targetCanonicalUid) as any;
    if (!target) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

    const result = await TransactionManager.execute("Invitation d'Oiseau", async (_mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const cypher = `
        MATCH (target:User { uid: $targetUserUid })
        MATCH (t:Team { uid: $teamUid })
        
        OPTIONAL MATCH (target)-[oldRefuse:REFUSED_INVITATION]->(t)
        DELETE oldRefuse
        
        WITH target, t
        MERGE (target)-[r:INVITED_TO]->(t)
        SET r.invitedAt = datetime($now),
            r.capabilities = $caps
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, { 
        targetUserUid: target.uid, 
        teamUid: team.uid,
        caps: data.capabilities || [CAPABILITIES.PROJECT.READ, CAPABILITIES.TASK.CREATE],
        now: now.toISOString()
      });

      return { 
        uid: target.uid,      
        success: true, 
        status: 'success', 
        mongo: target, 
        neo4j: neoResult 
      };
    });

    // 🛡️ PROBLÈME 1 : Tissage de la toile universelle sécurisé par try/catch en arrière-plan
    if (actorCanonicalUid !== targetCanonicalUid) {
      try {
        await syncUniversalInteraction(actorCanonicalUid, targetCanonicalUid, 'TEAM');
      } catch (err) {
        console.error(`  [Orchestrator] Échec non bloquant du tissage universel (inviteBird) :`, err);
      }
    }

    return result;
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

    const existingTeam = await findEntityBySlugOrUid(TeamModel, teamIdentifier) as any;
    if (!existingTeam) throw new IlotError("Nid introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Mutation de Nid", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: existingTeam.uid }, 
        { $set: { ...data, 'dates.updatedAt': now } }, 
        { new: true, session: mongoSession }
      ).lean();
      
      let neoResult = null;
      if (data.frequency !== undefined || data.isPrivate !== undefined || data.name !== undefined) {
        neoResult = await neo4jTx.run(
          `MATCH (t:Team {uid: $teamUid}) SET t.frequency = $freq, t.isPrivate = $priv, t.name = coalesce($name, t.name), t.updatedAt = datetime($now) RETURN t`,
          { 
            teamUid: existingTeam.uid, 
            freq: data.frequency ?? updatedTeam!.frequency, 
            priv: data.isPrivate ?? updatedTeam!.isPrivate,
            name: data.name ?? null,
            now: now.toISOString()
          }
        );
      }
      
      return { 
        uid: existingTeam.uid,  
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

    const team = await findEntityBySlugOrUid(TeamModel, teamIdentifier) as any;
    if (!team) throw new IlotError("Nid introuvable.", "NOT_FOUND", 404);

    const teamUid = team.uid;

    return await TransactionManager.execute("Dissolution de Nid", async (mongoSession, neo4jTx) => {
      // 🚀 PROBLÈME 3 : Projection stricte avec .select('documents') pour éliminer les Memory Spikes
      const projects = await ProjectModel.find({ ownerUid: teamUid }).select('documents uid').session(mongoSession).lean();
      const projectUids = projects.map((p: any) => p.uid);
      const tasks = await TaskModel.find({ projectUid: { $in: projectUids } }).select('documents').session(mongoSession).lean();

      // 1. Rassemblement de toutes les clés de fichiers à incinérer
      const filesToDelete: string[] = [];
      [...tasks, ...projects].forEach((entity: any) => {
        if (entity.documents && Array.isArray(entity.documents)) {
          entity.documents.forEach((doc: any) => {
            if (doc.url) {
              filesToDelete.push(this.storageService.extractKeyFromUrl(doc.url));
            }
          });
        }
      });

      // 2. Parallélisation massive de la purge physique S3/R2
      await Promise.all(
        filesToDelete.map(async (key) => {
          try {
            await this.storageService.deleteFile(key);
          } catch (err) {
            console.error(`  [Orchestrator] Échec purge fichier ${key} :`, err);
          }
        })
      );

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
    userIdentifier: string,
    mode: 'CLEAN' | 'TRACE',
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    const actorCanonicalUid = await this.resolveCanonicalUserUid(signature.actorUid);
    const targetCanonicalUid = await this.resolveCanonicalUserUid(userIdentifier);

    if (actorCanonicalUid !== targetCanonicalUid) {
      throw new IlotError("Tu ne peux pas forcer l'envol d'un autre oiseau via cette route.", "FORBIDDEN", 403);
    }

    const team = await findEntityBySlugOrUid(TeamModel, teamIdentifier) as any;
    if (!team) throw new IlotError("Nid introuvable dans la Silice.", "NOT_FOUND", 404);
    
    if (team.ownerUid === targetCanonicalUid) {
      throw new IlotError("L'Architecte ne peut pas abandonner son propre Nid. Dissous-le ou transmets sa clé.", "BAD_REQUEST", 400);
    }

    const teamUid = team.uid;

    return await TransactionManager.execute("L'Envol Volontaire", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      if (mode === 'CLEAN') {
        const cypherClean = `
          MATCH (u:User {uid: $userUid})
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
        await neo4jTx.run(cypherClean, { userUid: targetCanonicalUid, teamUid });

        // 🚀 PROBLÈMES 3 : Projection stricte .select('uid') pour alléger l'empreinte mémoire
        const projects = await ProjectModel.find({ ownerUid: teamUid }).select('uid').session(mongoSession).lean();
        const projectUids = projects.map((p: any) => p.uid);

        if (projectUids.length > 0) {
          await TaskModel.deleteMany({ 
            projectUid: { $in: projectUids }, 
            creatorUid: targetCanonicalUid 
          }).session(mongoSession);
        }

        const userProjects = await ProjectModel.find({ ownerUid: teamUid, creatorUid: targetCanonicalUid }).select('uid').session(mongoSession).lean();
        const userProjectUids = userProjects.map((p: any) => p.uid);

        if (userProjectUids.length > 0) {
          await TaskModel.deleteMany({ projectUid: { $in: userProjectUids } }).session(mongoSession);
          await ProjectModel.deleteMany({ ownerUid: teamUid, creatorUid: targetCanonicalUid }).session(mongoSession);
        }

      } else {
        const cypherTrace = `
          MATCH (u:User {uid: $userUid})
          MATCH (t:Team {uid: $teamUid})
          MATCH (u)-[r:MEMBER_OF|INVITED_TO|REFUSED_INVITATION]->(t)
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(cypherTrace, { userUid: targetCanonicalUid, teamUid });
      }

      await OiseauModel.findOneAndUpdate(
        { uid: targetCanonicalUid },
        { 
          $pull: { teams: team._id },
          $set: { 'dates.updatedAt': now }
        },
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