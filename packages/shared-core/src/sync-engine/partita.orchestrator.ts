// packages/shared-core/src/sync-engine/partita.orchestrator.ts
import { PartitaModel } from '../../../infrastructure/src/database/models/nosql/partita.model';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface PartitaSyncResult {
  uid?: string;
  id?: string;
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

/**
 * 🎸 PARTITA ORCHESTRATOR
 * Gère la sédimentation d'une partition et son tissage dans le Graphe (Neo4j).
 * Applique la résolution stricte par UID Canonique (Phase 2).
 */
export class PartitaOrchestrator {
  
  /**
   * 🎼 FONDATION : FORGER UNE PARTITION
   */
  async fosterPartita(data: any, signature: ActionSignature): Promise<PartitaSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour composer à la place d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fondation de Partition", async (mongoSession, neo4jTx) => {
      const partitaUid = data.uid || `partita_${randomUUID()}`;
      const title = data.title || "Partition sans nom";
      
      // 🪡 Sécurisation de l'unicité du slug dans la Silice
      let baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      let finalSlug = baseSlug;
      let slugExists = await PartitaModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await PartitaModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      const newPartitaData = {
        uid: partitaUid,
        title: title,
        slug: finalSlug,
        content: data.content || "",
        instrument: data.instrument || 'BASS',
        format: data.format || 'ABC',
        tuning: data.tuning || 'E1-A1-D2-G2',
        authorUid: signature.actorUid, // UID canonique strict garanti par l'auth
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: data.connections || {},
        merchLink: data.merchLink || null,
        media: data.media || {},
        settings: data.settings || {},
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newPartita] = await PartitaModel.create([newPartitaData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) avec MATCH strict
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (p:Partita { 
          uid: $partitaUid, 
          title: $title, 
          slug: $slug,
          instrument: $instrument,
          status: $status,
          createdAt: datetime() 
        })
        CREATE (u)-[:COMPOSED]->(p)

        WITH p
        UNWIND (CASE WHEN size($relatedProjects) = 0 THEN [null] ELSE $relatedProjects END) AS prUid
        FOREACH (_ IN CASE WHEN prUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (proj:Project {uid: prUid})
          MERGE (p)-[:ILLUMINATES]->(proj)
        )

        WITH p
        CALL {
          WITH p
          WITH p WHERE $productId IS NOT NULL
          MERGE (prod:Product {uid: $productId})
          MERGE (p)-[:OFFERS_PRODUCT]->(prod)
          RETURN count(*) as relCount
        }

        RETURN p
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        partitaUid: newPartita.uid,
        title: newPartita.title,
        slug: newPartita.slug,
        instrument: newPartita.instrument,
        status: newPartita.status,
        relatedProjects: newPartita.connections?.relatedProjects || [],
        productId: newPartita.merchLink?.productId || null
      });

      // 🛡️ VERROU DE SÉCURITÉ : Vérification de la création effective
      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Oiseau créateur introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newPartita,
        neo4j: neoResult
      };
    });
  }

  /**
   * 🔄 MUTATION : MISE À JOUR DE PARTITION
   * Résolution Silice (MongoDB) -> Propagation indexée Matrice (Neo4j)
   */
  async updatePartita(partitaUidOrSlug: string, updates: any, signature: ActionSignature): Promise<PartitaSyncResult> {
    // 1. Résolution stricte de l'UID canonique via la Silice
    const existing = await PartitaModel.findOne({ $or: [{ uid: partitaUidOrSlug }, { slug: partitaUidOrSlug }] });
    if (!existing) throw new IlotError("Partition introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres partitions.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Partition", async (mongoSession, neo4jTx) => {
      const updatedPartita = await PartitaModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: updates },
        { new: true, session: mongoSession }
      ).lean();

      let neoResult = null;
      if (updates.status || updates.instrument || updates.title || updates.merchLink) {
        // MATCH indexé rapide sur l'UID canonique
        neoResult = await neo4jTx.run(`
          MATCH (p:Partita { uid: $partitaUid })
          SET p.title = coalesce($title, p.title),
              p.status = coalesce($status, p.status),
              p.instrument = coalesce($instrument, p.instrument),
              p.updatedAt = datetime()
          
          WITH p
          OPTIONAL MATCH (p)-[r:OFFERS_PRODUCT]->(oldProd:Product)
          FOREACH (_ IN CASE WHEN $productId IS NULL AND r IS NOT NULL THEN [1] ELSE [] END | DELETE r)
          
          WITH p
          CALL {
            WITH p
            WITH p WHERE $productId IS NOT NULL
            MERGE (newProd:Product {uid: $productId})
            MERGE (p)-[:OFFERS_PRODUCT]->(newProd)
            RETURN count(*) as rc
          }

          RETURN p
        `, { 
          partitaUid: existing.uid, 
          title: updates.title || null,
          status: updates.status || null, 
          instrument: updates.instrument || null,
          productId: updates.merchLink?.productId || null
        });

        if (neoResult.records.length === 0) {
          throw new IlotError("Échec de la mutation : Partition introuvable dans le Graphe Neo4j.", "INTERNAL_ERROR", 500);
        }
      }

      return {
        success: true,
        status: 'success',
        mongo: updatedPartita,
        neo4j: neoResult
      };
    });
  }

  /**
   * 🔥 DÉSINTÉGRATION : PURGE D'UNE PARTITION
   */
  async disintegratePartita(partitaUidOrSlug: string, signature: ActionSignature) {
    const existing = await PartitaModel.findOne({ $or: [{ uid: partitaUidOrSlug }, { slug: partitaUidOrSlug }] });
    if (!existing) throw new IlotError("Partition introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cette partition.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Partition", async (mongoSession, neo4jTx) => {
      // 🪡 SUTURE : Au lieu de supprimer ici, on liste les URLs orphelines.
      // L'API de hub-central récupérera ce tableau et exécutera storageService.deleteFile()
      const filesToDelete: string[] = [];
      
      if (existing.media?.coverImageUrl) {
        filesToDelete.push(existing.media.coverImageUrl);
      }
      if (existing.media?.audioTrackUrl) {
        filesToDelete.push(existing.media.audioTrackUrl);
      }

      // Détachement propre via l'UID canonique
      await neo4jTx.run(`MATCH (p:Partita { uid: $partitaUid }) DETACH DELETE p`, { partitaUid: existing.uid });
      await PartitaModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1, filesToDelete };
    });
  }
}