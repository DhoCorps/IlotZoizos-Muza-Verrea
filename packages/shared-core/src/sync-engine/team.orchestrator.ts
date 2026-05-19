// packages/shared-core/src/sync-engine/team.orchestrator.ts
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { TeamModel } from '@ilot/infrastructure/src/database/models/nosql/team.model';
import { ProjectModel } from '@ilot/infrastructure/src/database/models/nosql/project.model'; // 🌟 SUTURE : Import du modèle des Chantiers
import { TaskModel } from '@ilot/infrastructure/src/database/models/nosql/task.model';       // 🌟 SUTURE : Import du modèle des Atomes
import { ITeam, CAPABILITIES, ActionSignature } from '@ilot/types';
import { MoralChecker } from '../integrity/moral.checker';
import { TransactionManager } from './transactionManager';
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
 * L'Architecte des liens. Assure la cohérence entre la Silice (Mongo) et le Graphe (Neo4j).
 * Modèle : "Zero-Identity"
 */
export class TeamOrchestrator {
  async fosterTeam(
    teamData: { 
      name: string, 
      description?: string,
      parentId?: string | null; // ✅ SYNCHRONISATION : On accepte le null de Zod
      category: string; 
      frequency?: string; 
      isPrivate: boolean; 
      ownerUid: string;
      leaderUid: string | null; // ✅ On harmonise aussi avec le schéma Zod
    },
    signature: ActionSignature
  ): Promise<TeamSyncResult> {
        
    // 1. Barrière de la Signature
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.CREATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour fonder une escouade", "FORBIDDEN", 403);
    }
    
    // 2. Le Veilleur (MoralChecker)
    const moralCheck = new MoralChecker();
    const check = moralCheck.analyze(teamData.name);
    if (!check.isSafe) throw new IlotError(`Nom invalide : ${check.suggestion}`, "BAD_REQUEST", 400);

    // 3. Vérification de l'Empreinte
    const creator = await OiseauModel.findOne({ uid: signature.actorUid });
    if (!creator) throw new IlotError("Empreinte créatrice introuvable dans la canopée.", "NOT_FOUND", 404);

    const teamUid = `team_${randomUUID()}`;
    const defaultFreq = teamData.frequency || '#2A3B4C';

    return await TransactionManager.execute("Fondation d'Escouade", async (mongoSession, neo4jTx) => {
      // 🐘 MONGO : Sédimentation
      const [newTeam] = await TeamModel.create([{
        uid: teamUid, 
        name: teamData.name,
        description: teamData.description,
        category: teamData.category,
        frequency: defaultFreq,
        isPrivate: teamData.isPrivate,
        ownerUid: creator.uid, // ✅ SUTURE : ownerId -> ownerUid
        leaderUid: creator.uid, // ✅ SUTURE : Ajout du leaderUid par défaut
        parentId: teamData.parentId || null
      }], { session: mongoSession });

      // Liaison dans la Silice
      await OiseauModel.findOneAndUpdate(
        { uid: creator.uid },
        { $push: { teams: newTeam._id } }, 
        { session: mongoSession }
      );

      // 🕸️ NEO4J : Le Graphe Muet
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

        // 1. Le lien d'Origine (Immuable)
        MERGE (u)-[:FOUNDED]->(t)

        // 2. Le lien d'Appartenance (Fluide) - 🪡 SUTURE : Ajout de la variable r pour le SET suivant
        MERGE (u)-[r:MEMBER_OF]->(t)
        SET r.since = datetime(), 
            r.capabilities = $capabilities // L'Aura suffit à définir le pouvoir
        
        WITH t
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

  // --- 🤝 RECRUTEMENT DYNAMIQUE ---

  async getRecruitableBirds(search: string = "") {
    return await OiseauModel.find({
      isOpenToInvitations: true, 
      pseudo: { $regex: search, $options: 'i' }
    }).select('uid pseudo frequenceHEX capabilities bio').limit(10).lean();
  }

  async inviteBird(
    data: { teamUid: string; targetUserUid: string; capabilities?: string[] },
    signature: ActionSignature
  ) {
    // 1. On va chercher le Nid dans la Silice pour vérifier qui en est le Gardien
    const team = await TeamModel.findOne({ uid: data.teamUid });
    if (!team) {
      throw new IlotError("Ce Nid n'existe pas dans la Silice.", "NOT_FOUND", 404);
    }

    // 🌟 LA RÈGLE SOUVERAINE : Si tu es le fondateur (owner) de l'équipe, tu as le droit inhérent d'inviter !
    const isNestOwner = team.ownerUid === signature.actorUid;
    const hasGlobalPower = signature.capabilities.includes(CAPABILITIES.MEMBER.INVITE) || 
                           signature.capabilities.includes('*');

    if (!isNestOwner && !hasGlobalPower) {
      throw new IlotError("Aura insuffisante pour recruter dans ce Nid.", "FORBIDDEN", 403);
    }

    const target = await OiseauModel.findOne({ uid: data.targetUserUid });
    if (!target) throw new IlotError("Oiseau introuvable.", "NOT_FOUND", 404);

    return await TransactionManager.execute("Invitation d'Oiseau", async (mongoSession, neo4jTx) => {
      // 🛡️ SUTURE : MERGE assure que l'utilisateur existe dans le Graphe pour porter le lien
      // 🪡 HARMONISATION : Supprime un éventuel ancien refus pour réinviter proprement
      const cypher = `
        MERGE (target:User { uid: $targetUserUid })
        ON CREATE SET target.pseudo = $pseudo, target.frequenceHEX = $hex
        
        WITH target
        MATCH (t:Team { uid: $teamUid })
        
        OPTIONAL MATCH (target)-[oldRefuse:REFUSED_INVITATION]->(t)
        DELETE oldRefuse
        
        WITH target, t
        // Création du lien d'invitation avec ses plumes spécifiques
        MERGE (target)-[r:INVITED_TO]->(t)
        SET r.invitedAt = datetime(),
            r.capabilities = $caps // 🛡️ Suture des droits millimétrés
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, { 
        targetUserUid: data.targetUserUid, 
        pseudo: target.pseudo,
        hex: target.frequenceHEX,
        teamUid: data.teamUid,
        caps: data.capabilities || [CAPABILITIES.PROJECT.READ, CAPABILITIES.TASK.CREATE] 
      });

      return { success: true, status: 'success', mongo: target, neo4j: neoResult };
    });
  }

  // --- 🎭 MUTATION & DISSOLUTION ---

  async mutateTeam(
    teamUid: string, 
    data: Partial<ITeam>, 
    signature: ActionSignature
  ): Promise<TeamSyncResult> {
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.UPDATE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Action interdite par la matrice.", "FORBIDDEN", 403);
    }

    if (data.name) {
      const moralCheck = new MoralChecker(); // ✅ Correction typo
      const check = moralCheck.analyze(data.name);
      if (!check.isSafe) throw new IlotError(`Nom invalide : ${check.suggestion}`, "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Mutation de Nid", async (mongoSession, neo4jTx) => {
      const updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: teamUid }, { $set: data }, { new: true, session: mongoSession }
      ).lean();
      
      if (!updatedTeam) throw new IlotError("Nid introuvable.", "NOT_FOUND", 404);

      let neoResult = null;
      if (data.frequency !== undefined || data.isPrivate !== undefined) {
        neoResult = await neo4jTx.run(
          `MATCH (t:Team {uid: $teamUid}) SET t.frequency = $freq, t.isPrivate = $priv RETURN t`,
          { 
            teamUid, 
            freq: data.frequency ?? updatedTeam.frequency, 
            priv: data.isPrivate ?? updatedTeam.isPrivate 
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

  async dissolveTeam(
    teamUid: string, 
    signature: ActionSignature
  ): Promise<boolean> {
    if (!signature.capabilities.includes(CAPABILITIES.TEAM.DELETE) && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour dissoudre ce Nid.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Dissolution de Nid", async (mongoSession, neo4jTx) => {
      await neo4jTx.run(`MATCH (t:Team {uid: $teamUid}) DETACH DELETE t`, { teamUid });
      const deletedTeam = await TeamModel.findOneAndDelete({ uid: teamUid }, { session: mongoSession });
      
      if (deletedTeam) {
        await OiseauModel.updateMany(
          { teams: deletedTeam._id }, 
          { $pull: { teams: deletedTeam._id } }, 
          { session: mongoSession }
        );
      }
      return true;
    });
  }

  /**
   * 🕊️ L'ENVOL VOLONTAIRE (Quitter une Escouade)
   * Mode 'CLEAN' : L'oiseau efface son lien et désintègre ses créations dans ce Nid.
   * Mode 'TRACE' : L'oiseau rompt le lien mais laisse ses Atomes en héritage.
   */
  async leaveTeam(
    teamUid: string,
    userUid: string,
    mode: 'CLEAN' | 'TRACE',
    signature: ActionSignature
  ): Promise<{ success: boolean; message: string }> {
    
    // 🛡️ SÉCURITÉ : Un oiseau ne peut signer que son propre départ volontaire
    if (signature.actorUid !== userUid) {
      throw new IlotError("Tu ne peux pas forcer l'envol d'un autre oiseau via cette route.", "FORBIDDEN", 403);
    }

    const team = await TeamModel.findOne({ uid: teamUid });
    if (!team) throw new IlotError("Nid introuvable dans la Silice.", "NOT_FOUND", 404);
    if (team.ownerUid === userUid) {
      throw new IlotError("L'Architecte ne peut pas abandonner son propre Nid. Dissous-le ou transmets sa clé.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("L'Envol Volontaire", async (mongoSession, neo4jTx) => {
      
      if (mode === 'CLEAN') {
        // 🕸️ A.1 NEO4J SUTURE TOTALE : Éradication des Atomes, Chantiers et Traces de refus de l'oiseau au sein de ce Nid
        const cypherClean = `
          MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
          
          // 1. Tâches créées par l'utilisateur sur n'importe quel projet du Nid
          OPTIONAL MATCH (t)-[:HAS_PROJECT]->(pAll:Project)<-[:TASK_OF]-(tk:Task)
          WHERE tk.creatorUid = $userUid
          WITH r, t, collect(DISTINCT tk) AS userTasks
          
          // 2. Projets (Chantiers) fondés directement par l'utilisateur dans ce Nid
          OPTIONAL MATCH (t)-[:HAS_PROJECT]->(pUser:Project)
          WHERE pUser.creatorUid = $userUid
          
          // 3. Toutes les tâches liées aux projets fondés par l'utilisateur (pour éviter les tâches orphelines)
          OPTIONAL MATCH (pUser)<-[:TASK_OF]-(tkOrphan:Task)
          WITH r, userTasks, collect(DISTINCT pUser) AS userProjects, collect(DISTINCT tkOrphan) AS orphanTasks
          
          FOREACH (task IN userTasks | DETACH DELETE task)
          FOREACH (orphan IN orphanTasks | DETACH DELETE orphan)
          FOREACH (proj IN userProjects | DETACH DELETE proj)
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(cypherClean, { userUid, teamUid });

        // 🐘 A.2 MONGO PURIFIÉ AUTOMATIQUE
        const projects = await ProjectModel.find({ ownerUid: teamUid }).session(mongoSession).lean();
        const projectUids = projects.map(p => p.uid);

        if (projectUids.length > 0) {
          // Supprimer ses tâches dans les projets généraux du Nid
          await TaskModel.deleteMany({ 
            projectUid: { $in: projectUids }, 
            creatorUid: userUid 
          }).session(mongoSession);
        }

        // Identifier les chantiers créés spécifiquement par l'utilisateur dans ce nid
        const userProjects = await ProjectModel.find({ ownerUid: teamUid, creatorUid: userUid }).session(mongoSession).lean();
        const userProjectUids = userProjects.map(p => p.uid);

        if (userProjectUids.length > 0) {
          // Supprimer l'intégralité des tâches rattachées à ses propres projets
          await TaskModel.deleteMany({ projectUid: { $in: userProjectUids } }).session(mongoSession);
          // Supprimer les chantiers eux-mêmes
          await ProjectModel.deleteMany({ ownerUid: teamUid, creatorUid: userUid }).session(mongoSession);
        }

      } else {
        // 🕸️ B.1 NEO4J : Mode TRACE - On tranche uniquement le lien d'appartenance, d'invitation ou de refus
        const cypherTrace = `
          MATCH (u:User {uid: $userUid})-[r:MEMBER_OF|INVITED_TO|REFUSED_INVITATION]->(t:Team {uid: $teamUid})
          DELETE r
          RETURN 1
        `;
        await neo4jTx.run(cypherTrace, { userUid, teamUid });
      }

      // 🐘 NETTOYAGE COMMUN : Extraction du Nid du catalogue de l'Oiseau
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