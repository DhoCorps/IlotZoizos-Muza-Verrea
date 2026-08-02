import { PartitaModel } from '../../../infrastructure/src/database/models/nosql/partita.model';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { storageService } from '../../../../apps/hub-central/modules/storage/storage.service';

export interface PartitaSyncResult {
  success: boolean;
  status: string;
  mongo: any;
  neo4j: any;
}

const generateSlug = (text: string) => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

/**
 * PARTITA ORCHESTRATOR
 * Gère la sédimentation d'une partition et son tissage dans le Graphe (Neo4j).
 */
export class PartitaOrchestrator {
  
  async fosterPartita(data: any, signature: ActionSignature): Promise<PartitaSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour composer à la place d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fondation de Partition", async (mongoSession, neo4jTx) => {
      const partitaUid = data.uid || `partita_${randomUUID()}`;
      const title = data.title || "Partition sans nom";
      
      // 🪡 Sécurisation de l'unicité du slug
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
        slug: finalSlug, // Injection du slug unique
        content: data.content || "",
        instrument: data.instrument || 'BASS',
        format: data.format || 'ABC',
        tuning: data.tuning || 'E1-A1-D2-G2',
        authorUid: signature.actorUid,
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: data.connections || {},
        merchLink: data.merchLink || null,
        media: data.media || {},
        settings: data.settings || {},
      };

      // 1. Silice (MongoDB)
      const [newPartita] = await PartitaModel.create([newPartitaData], { session: mongoSession });

      // 2. Graphe (Neo4j) - On stocke aussi le slug dans le graphe si besoin
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

      return {
        success: true,
        status: 'success',
        mongo: newPartita,
        neo4j: neoResult
      };
    });
  }

  async updatePartita(partitaUidOrSlug: string, updates: any, signature: ActionSignature): Promise<PartitaSyncResult> {
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
      }

      return {
        success: true,
        status: 'success',
        mongo: updatedPartita,
        neo4j: neoResult
      };
    });
  }

  async disintegratePartita(partitaUidOrSlug: string, signature: ActionSignature) {
    const existing = await PartitaModel.findOne({ $or: [{ uid: partitaUidOrSlug }, { slug: partitaUidOrSlug }] });
    if (!existing) throw new IlotError("Partition introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cette partition.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Partition", async (mongoSession, neo4jTx) => {
      if (existing.media?.coverImageUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.coverImageUrl)); } catch {}
      }
      if (existing.media?.audioTrackUrl) {
        try { await storageService.deleteFile(storageService.extractKeyFromUrl(existing.media.audioTrackUrl)); } catch {}
      }

      await neo4jTx.run(`MATCH (p:Partita { uid: $partitaUid }) DETACH DELETE p`, { partitaUid: existing.uid });
      await PartitaModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });
  }
}