// packages/shared-core/src/sync-engine/sujet.orchestrator.ts
import { SujetModel } from '../../../infrastructure/src/database/models/nosql/sujet.model';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
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
 * Gère la sédimentation d'une pensée dans la Silice et son tissage dans le Graphe.
 */
export class SujetOrchestrator {
  
  /**
   * FONDATION : FORGER UN NŒUD DE PENSÉE (Sujet)
   */
  async fosterSujet(data: any, signature: ActionSignature): Promise<SujetSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour parler à la place d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fondation de Sujet", async (mongoSession, neo4jTx) => {
      
      const sujetUid = data.uid || `sujet_${randomUUID()}`;
      const title = data.title || "Monologue sans nom";
      
      // Sécurisation de l'unicité du slug
      let baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      let finalSlug = baseSlug;
      let slugExists = await SujetModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await SujetModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      const newSujetData = {
        uid: sujetUid,
        title: title,
        slug: finalSlug,
        content: data.content || "",
        lyrics: data.lyrics || null,
        copyright: data.copyright || null,
        authorUid: signature.actorUid,
        category: data.category || 'MONOLOGUE',
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: data.connections || {},
        merchLink: data.merchLink || null,
        media: data.media || {},
        settings: data.settings || {},
      };

      // 1. SILICE (MongoDB)
      const [newSujet] = await SujetModel.create([newSujetData], { session: mongoSession });

      // 2. GRAPHE (Neo4j)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sujet { 
          uid: $sujetUid, 
          title: $title, 
          slug: $slug,
          category: $category,
          status: $status,
          createdAt: datetime() 
        })
        CREATE (u)-[:WROTE]->(s)

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

        WITH s
        CALL {
          WITH s
          WITH s WHERE $productId IS NOT NULL
          MERGE (prod:Product {uid: $productId})
          MERGE (s)-[:OFFERS_PRODUCT]->(prod)
          RETURN count(*) as relCount
        }

        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        sujetUid: newSujet.uid,
        title: newSujet.title,
        slug: newSujet.slug,
        category: newSujet.category,
        status: newSujet.status,
        relatedProjects: newSujet.connections?.relatedProjects || [],
        relatedTasks: newSujet.connections?.relatedTasks || [],
        productId: newSujet.merchLink?.productId || null
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
   * MUTATION : METTRE À JOUR UN SUJET (Supporte uid ou slug)
   */
  async updateSujet(sujetIdentifier: string, updates: any, signature: ActionSignature): Promise<SujetSyncResult> {
    const existing = await SujetModel.findOne({ $or: [{ uid: sujetIdentifier }, { slug: sujetIdentifier }] });
    if (!existing) throw new IlotError("Sujet introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne modifier que tes propres pensées.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Sujet", async (mongoSession, neo4jTx) => {
      const updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: updates },
        { new: true, session: mongoSession }
      ).lean();

      let neoResult = null;
      if (updates.status || updates.category || updates.title || updates.merchLink) {
        neoResult = await neo4jTx.run(`
          MATCH (s:Sujet { uid: $sujetUid })
          SET s.title = coalesce($title, s.title),
              s.status = coalesce($status, s.status),
              s.category = coalesce($category, s.category),
              s.updatedAt = datetime()
          
          WITH s
          OPTIONAL MATCH (s)-[r:OFFERS_PRODUCT]->(oldProd:Product)
          FOREACH (_ IN CASE WHEN $productId IS NULL AND r IS NOT NULL THEN [1] ELSE [] END | DELETE r)
          
          WITH s
          CALL {
            WITH s
            WITH s WHERE $productId IS NOT NULL
            MERGE (newProd:Product {uid: $productId})
            MERGE (s)-[:OFFERS_PRODUCT]->(newProd)
            RETURN count(*) as rc
          }

          RETURN s
        `, { 
          sujetUid: existing.uid, 
          title: updates.title || null,
          status: updates.status || null, 
          category: updates.category || null,
          productId: updates.merchLink?.productId || null
        });
      }

      return {
        success: true,
        status: 'success',
        mongo: updatedSujet,
        neo4j: neoResult
      };
    });
  }

  /**
   * DÉSINTÉGRATION : PURGER UN SUJET (Supporte uid ou slug)
   */
  async disintegrateSujet(sujetIdentifier: string, signature: ActionSignature) {
    const existing = await SujetModel.findOne({ $or: [{ uid: sujetIdentifier }, { slug: sujetIdentifier }] });
    if (!existing) throw new IlotError("Sujet introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler ce texte.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Sujet", async (mongoSession, neo4jTx) => {
      if (existing.media?.coverImageUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.coverImageUrl)); } catch {}
      }
      if (existing.media?.audioTrackUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.audioTrackUrl)); } catch {}
      }

      await neo4jTx.run(`MATCH (s:Sujet { uid: $sujetUid }) DETACH DELETE s`, { sujetUid: existing.uid });
      await SujetModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });
  }
}