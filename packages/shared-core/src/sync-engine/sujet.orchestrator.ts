// packages/shared-core/src/sync-engine/sujet.orchestrator.ts

import { SujetModel } from '../../../infrastructure/src/database/models/nosql/sujet.model';
import { ProjectModel } from '../../../infrastructure/src/database/models/nosql/project.model';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { ISujet, CAPABILITIES, ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';

export interface SujetSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

/**
 * SUJET ORCHESTRATOR
 * Gère la sédimentation d'une pensée dans la Silice et son tissage dans le Graphe (tom§hat§toes).
 */
export class SujetOrchestrator {
  
  /**
   * FONDATION : FORGER UN NŒUD DE PENSÉE (Sujet)
   */
  async fosterSujet(data: any, signature: ActionSignature): Promise<SujetSyncResult> {
    // 1. Contrôle d'Aura basique
    // Soit c'est mon propre monologue, soit j'ai le pouvoir de publier pour l'Îlot.
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour parler à la place d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fondation de Sujet", async (mongoSession, neo4jTx) => {
      
      const sujetUid = data.uid || `sujet_${randomUUID()}`;
      const title = data.title || "Monologue sans nom";
      
      const newSujetData = {
        uid: sujetUid,
        title: title,
        slug: data.slug || generateSlug(title),
        content: data.content || "",
        authorUid: signature.actorUid,
        category: data.category || 'MONOLOGUE',
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: data.connections || {},
        media: data.media || {},
        settings: data.settings || {},
      };

      // 2. SILICE (MongoDB) : L'Archive Concrète
      const [newSujet] = await SujetModel.create([newSujetData], { session: mongoSession });

      // 3. GRAPHE (Neo4j) : Le Tissu Connecteur (tom§hat§toes)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sujet { 
          uid: $sujetUid, 
          title: $title, 
          category: $category,
          status: $status,
          createdAt: datetime() 
        })
        CREATE (u)-[:WROTE]->(s)

        // SUTURE tom§hat§toes : Tissage dynamique des liens
        WITH s
        UNWIND (CASE WHEN size($relatedProjects) = 0 THEN [null] ELSE $relatedProjects END) AS pUid
        FOREACH (_ IN CASE WHEN pUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (p:Project {uid: pUid})
          MERGE (s)-[:ILLUMINATES]->(p)
        )

        WITH s
        UNWIND (CASE WHEN size($relatedTasks) = 0 THEN [null] ELSE $relatedTasks END) AS tUid
        FOREACH (_ IN CASE WHEN tUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (t:Task {uid: tUid})
          MERGE (s)-[:DETAILS]->(t)
        )

        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        sujetUid: newSujet.uid,
        title: newSujet.title,
        category: newSujet.category,
        status: newSujet.status,
        relatedProjects: newSujet.connections?.relatedProjects || [],
        relatedTasks: newSujet.connections?.relatedTasks || []
      });

      return {
        success: true,
        status: 'success',
        mongo: newSujet,
        neo4j: neoResult
      };
    });
  }

  /**
   * MUTATION : METTRE À JOUR UN SUJET
   */
  async updateSujet(sujetUid: string, updates: any, signature: ActionSignature): Promise<SujetSyncResult> {
    const existing = await SujetModel.findOne({ uid: sujetUid });
    if (!existing) throw new IlotError("Sujet introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres pensées.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Sujet", async (mongoSession, neo4jTx) => {
      // 1. Silice
      const updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: sujetUid },
        { $set: updates },
        { new: true, session: mongoSession }
      ).lean();

      // 2. Graphe : Si le statut ou la catégorie changent
      let neoResult = null;
      if (updates.status || updates.category || updates.title) {
        neoResult = await neo4jTx.run(`
          MATCH (s:Sujet { uid: $sujetUid })
          SET s.title = coalesce($title, s.title),
              s.status = coalesce($status, s.status),
              s.category = coalesce($category, s.category),
              s.updatedAt = datetime()
          RETURN s
        `, { 
          sujetUid, 
          title: updates.title || null,
          status: updates.status || null, 
          category: updates.category || null 
        });
      }

      // TODO : Gérer l'ajout/retrait dynamique des liens tom§hat§toes dans neo4j 
      // si updates.connections est modifié (comme pour assigneeUids dans Task).

      return {
        success: true,
        status: 'success',
        mongo: updatedSujet,
        neo4j: neoResult
      };
    });
  }

  /**
   * DÉSINTÉGRATION : PURGER UN SUJET
   */
  async disintegrateSujet(sujetUid: string, signature: ActionSignature) {
    const existing = await SujetModel.findOne({ uid: sujetUid });
    if (!existing) throw new IlotError("Sujet introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler ce texte.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Sujet", async (mongoSession, neo4jTx) => {
      // 1. Purge Physique (Si le texte a des cover images ou pistes audio rattachées)
      if (existing.media?.coverImageUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.coverImageUrl)); } catch {}
      }
      if (existing.media?.audioTrackUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.audioTrackUrl)); } catch {}
      }

      // 2. Suppression Graphe
      await neo4jTx.run(`MATCH (s:Sujet { uid: $sujetUid }) DETACH DELETE s`, { sujetUid });

      // 3. Suppression Silice
      await SujetModel.deleteOne({ uid: sujetUid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });
  }
}