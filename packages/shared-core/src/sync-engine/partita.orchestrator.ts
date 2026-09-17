import { PartitaModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IPartita } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { MusicTheoryEngine, Note } from '../utils/musicTheory.engine';
import { generateSlug } from '../utils/string.engine';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié

export interface PartitaSyncResult {
  uid?: string;
  id?: string;
  success: boolean;
  status: string;
  mongo: IPartita;
  neo4j: unknown;
}

export interface FosterPartitaPayload {
  uid?: string;
  title?: string;
  slug?: string;
  content?: string;
  instrument?: string;
  format?: string;
  tuning?: string;
  authorUid: string;
  status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  tags?: string[];
  connections?: {
    relatedProjects?: string[];
  };
  merchLink?: {
    productId?: string;
  };
  media?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface UpdatePartitaPayload {
  title?: string;
  content?: string;
  status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  instrument?: string;
  merchLink?: {
    productId?: string;
  };
  [key: string]: unknown;
}

/**
 * 🎸 PARTITA ORCHESTRATOR
 * Gère la sédimentation d'une partition et son tissage dans le Graphe (Neo4j).
 * Applique la résolution stricte par UID Canonique et une unicité atomique anti-concurrence.
 */
export class PartitaOrchestrator {
  
  /**
   * Analyse sommaire du contenu pour en extraire des notes brutes.
   */
  private extractNotesFromContent(content: string): Note[] {
    const noteRegex = /\b([CDEFGAB][#b]?)\b/g;
    const notes: Note[] = [];
    let match: RegExpExecArray | null;
    while ((match = noteRegex.exec(content)) !== null) {
      let n = match[1].toUpperCase();
      if (n === 'DB') n = 'C#';
      if (n === 'EB') n = 'D#';
      if (n === 'GB') n = 'F#';
      if (n === 'AB') n = 'G#';
      if (n === 'BB') n = 'A#';
      if (['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].includes(n)) {
          notes.push(n as Note);
      }
    }
    return notes;
  }

  /**
   * 🎼 FONDATION : FORGER UNE PARTITION
   */
  async fosterPartita(data: FosterPartitaPayload, signature: ActionSignature): Promise<PartitaSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour composer à la place d'un autre.", "FORBIDDEN", 403);
    }

    const playedNotes = this.extractNotesFromContent(data.content || "");
    
    type ScaleMatch = ReturnType<typeof MusicTheoryEngine.detectScale>[number];
    const detectedScales = playedNotes.length >= 3 ? MusicTheoryEngine.detectScale(playedNotes) : [];
    
    const bestScale: ScaleMatch | null = (detectedScales.length > 0 && detectedScales[0].score >= 80) 
      ? detectedScales[0] 
      : null;

    return await TransactionManager.execute("Fondation de Partition", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const partitaUid = data.uid || `partita_${randomUUID()}`;
      const title = data.title || "Partition sans nom";
    
      // Sécurisation atomique de l'unicité du slug via l'utilitaire global
      const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      const finalSlug = await ensureUniqueSlug(PartitaModel, baseSlug, mongoSession);

      const newPartitaData = {
        uid: partitaUid,
        title: title,
        slug: finalSlug,
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
        theory: bestScale ? { root: bestScale.root, scaleKey: bestScale.scaleKey, score: bestScale.score } : null,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB) avec gestion gracieuse de secours E11000
      let newPartitaDoc;
      try {
        const created = await PartitaModel.create([newPartitaData], { session: mongoSession });
        newPartitaDoc = created[0];
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000) {
          throw new IlotError("Collision critique de slug sur la partition. Veuillez réitérer.", "CONFLICT", 409);
        }
        throw err;
      }
      
      const newPartita = (typeof newPartitaDoc.toObject === 'function' ? newPartitaDoc.toObject() : newPartitaDoc) as unknown as IPartita;

      // 2. Tissage dans le Graphe (Neo4j)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (p:Partita { 
           uid: $partitaUid, 
           title: $title, 
           slug: $slug,
           instrument: $instrument,
           status: $status,
           createdAt: datetime($now),
           updatedAt: datetime($now)
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

        WITH p
        CALL {
            With p
            WITH p WHERE $scaleRoot IS NOT NULL AND $scaleKey IS NOT NULL
            MERGE (scale:Scale { root: $scaleRoot, scaleKey: $scaleKey })
            ON CREATE SET scale.name = $scaleName, scale.flavor = $scaleFlavor
            MERGE (p)-[:RESONATES_IN_SCALE { confidenceScore: $scaleScore }]->(scale)
            RETURN count(*) as scaleCount
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
        productId: newPartita.merchLink?.productId || null,
        scaleRoot: bestScale?.root || null,
        scaleKey: bestScale?.scaleKey || null,
        scaleName: bestScale?.scaleName || null,
        scaleFlavor: bestScale?.flavor || null,
        scaleScore: bestScale?.score || null,
        now: now.toISOString()
      });

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
   */
  async updatePartita(partitaUidOrSlug: string, updates: UpdatePartitaPayload, signature: ActionSignature): Promise<PartitaSyncResult> {
    const existing = await findEntityBySlugOrUid(PartitaModel, partitaUidOrSlug) as IPartita | null;
    if (!existing) throw new IlotError("Partition introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres partitions.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Partition", async (mongoSession, neo4jTx) => {
      const now = new Date();

      let theoryUpdate = {};
      let bestScale = null;
      if (updates.content && updates.content !== existing.content) {
          const playedNotes = this.extractNotesFromContent(updates.content);
          const detectedScales = playedNotes.length >= 3 ? MusicTheoryEngine.detectScale(playedNotes) : [];
          bestScale = (detectedScales.length > 0 && detectedScales[0].score >= 80) ? detectedScales[0] : null;
          theoryUpdate = { theory: bestScale ? { root: bestScale.root, scaleKey: bestScale.scaleKey, score: bestScale.score } : null };
      }

      const finalUpdates = { 
        ...updates, 
        ...theoryUpdate, 
        'dates.updatedAt': now 
      };

      const updatedPartita = await PartitaModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: finalUpdates },
        { new: true, session: mongoSession }
      ).lean() as unknown as IPartita;

      let neoResult = null;
      if (updates.status || updates.instrument || updates.title || updates.merchLink || updates.content) {
        neoResult = await neo4jTx.run(`
          MATCH (p:Partita { uid: $partitaUid })
          SET p.title = coalesce($title, p.title),
              p.status = coalesce($status, p.status),
              p.instrument = coalesce($instrument, p.instrument),
              p.updatedAt = datetime($now)
          
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

          WITH p
          OPTIONAL MATCH (p)-[oldScaleRel:RESONATES_IN_SCALE]->(:Scale)
          FOREACH (_ IN CASE WHEN $scaleRoot IS NOT NULL THEN [1] ELSE [] END | DELETE oldScaleRel)

          WITH p
          CALL {
              With p
              WITH p WHERE $scaleRoot IS NOT NULL AND $scaleKey IS NOT NULL
              MERGE (scale:Scale { root: $scaleRoot, scaleKey: $scaleKey })
              ON CREATE SET scale.name = $scaleName, scale.flavor = $scaleFlavor
              MERGE (p)-[:RESONATES_IN_SCALE { confidenceScore: $scaleScore }]->(scale)
              RETURN count(*) as scaleCount
          }

          RETURN p
        `, { 
          partitaUid: existing.uid, 
          title: updates.title || null,
          status: updates.status || null, 
          instrument: updates.instrument || null,
          productId: updates.merchLink?.productId || null,
          scaleRoot: bestScale?.root || null,
          scaleKey: bestScale?.scaleKey || null,
          scaleName: bestScale?.scaleName || null,
          scaleFlavor: bestScale?.flavor || null,
          scaleScore: bestScale?.score || null,
          now: now.toISOString()
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
  async disintegratePartita(partitaUidOrSlug: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number; filesToDelete: string[] }> {
    const existing = await findEntityBySlugOrUid(PartitaModel, partitaUidOrSlug) as IPartita | null;
    if (!existing) throw new IlotError("Partition introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cette partition.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Partition", async (mongoSession, neo4jTx) => {
      const filesToDelete: string[] = [];
      const media = existing.media as { coverImageUrl?: string; audioTrackUrl?: string } | undefined;
      if (media?.coverImageUrl) filesToDelete.push(media.coverImageUrl);
      if (media?.audioTrackUrl) filesToDelete.push(media.audioTrackUrl);

      await neo4jTx.run(`MATCH (p:Partita { uid: $partitaUid }) DETACH DELETE p`, { partitaUid: existing.uid });
      await PartitaModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1, filesToDelete };
    });
  }
}