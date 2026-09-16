import { PartitaModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IPartita } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { MusicTheoryEngine, Note } from '../utils/musicTheory.engine';
import { generateSlug } from '../utils/string.engine';

export interface PartitaSyncResult {
  uid?: string;
  id?: string;
  success: boolean;
  status: string;
  mongo: IPartita;
  neo4j: any;
}

/**
 * 🎸 PARTITA ORCHESTRATOR
 * Gère la sédimentation d'une partition et son tissage dans le Graphe (Neo4j).
 * Applique la résolution stricte par UID Canonique (Phase 2).
 */
export class PartitaOrchestrator {
  
  /**
   * Analyse sommaire du contenu pour en extraire des notes brutes.
   * (Pour l'instant, on cherche de simples lettres A-G avec des altérations éventuelles).
   */
  private extractNotesFromContent(content: string): Note[] {
    const noteRegex = /\b([CDEFGAB][#b]?)\b/g;
    const notes: Note[] = [];
    let match;
    while ((match = noteRegex.exec(content)) !== null) {
      // Normalisation très basique (on convertit les bémols en dièses pour le moteur)
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
  async fosterPartita(data: any, signature: ActionSignature): Promise<PartitaSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour composer à la place d'un autre.", "FORBIDDEN", 403);
    }

    // 🔥 DÉTECTION THÉORIQUE DES GAMMES
    const playedNotes = this.extractNotesFromContent(data.content || "");
    
    // Typage strict inféré directement depuis le moteur de théorie musicale (zéro 'any')
    type ScaleMatch = ReturnType<typeof MusicTheoryEngine.detectScale>[number];
    
    const detectedScales = playedNotes.length >= 3 ? MusicTheoryEngine.detectScale(playedNotes) : [];
    
    // On garde uniquement la meilleure correspondance si son score est élevé
    const bestScale: ScaleMatch | null = (detectedScales.length > 0 && detectedScales[0].score >= 80) 
      ? detectedScales[0] 
      : null;

    return await TransactionManager.execute("Fondation de Partition", async (mongoSession, neo4jTx) => {
      const partitaUid = data.uid || `partita_${randomUUID()}`;
      const title = data.title || "Partition sans nom";
    
      
      // 🪡 Sécurisation de l'unicité du slug dans la Silice via l'utilitaire partagé
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
        authorUid: signature.actorUid,
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: data.connections || {},
        merchLink: data.merchLink || null,
        media: data.media || {},
        settings: data.settings || {},
        // On sauvegarde la théorie dans Mongo pour un accès API rapide
        theory: bestScale ? { root: bestScale.root, scaleKey: bestScale.scaleKey, score: bestScale.score } : null
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newPartitaDoc] = await PartitaModel.create([newPartitaData], { session: mongoSession });
      const newPartita = newPartitaDoc.toObject() as unknown as IPartita;

      // 2. Tissage dans le Graphe (Neo4j)
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

        // TISSAGE DE LA GAMME DÉTECTÉE
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
        // Paramètres pour le tissage harmonique
        scaleRoot: bestScale?.root || null,
        scaleKey: bestScale?.scaleKey || null,
        scaleName: bestScale?.scaleName || null,
        scaleFlavor: bestScale?.flavor || null,
        scaleScore: bestScale?.score || null
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
   */
  async updatePartita(partitaUidOrSlug: string, updates: any, signature: ActionSignature): Promise<PartitaSyncResult> {
    const existing = await findEntityBySlugOrUid(PartitaModel, partitaUidOrSlug);
    if (!existing) throw new IlotError("Partition introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = (existing as any).authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres partitions.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Partition", async (mongoSession, neo4jTx) => {
      // 🧮 Refaire la détection si le contenu a changé
      let theoryUpdate = {};
      let bestScale = null;
      if (updates.content && updates.content !== (existing as any).content) {
          const playedNotes = this.extractNotesFromContent(updates.content);
          const detectedScales = playedNotes.length >= 3 ? MusicTheoryEngine.detectScale(playedNotes) : [];
          bestScale = (detectedScales.length > 0 && detectedScales[0].score >= 80) ? detectedScales[0] : null;
          theoryUpdate = { theory: bestScale ? { root: bestScale.root, scaleKey: bestScale.scaleKey, score: bestScale.score } : null };
      }

      const finalUpdates = { ...updates, ...theoryUpdate };

      const updatedPartita = await PartitaModel.findOneAndUpdate(
        { uid: (existing as any).uid },
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

          WITH p
          OPTIONAL MATCH (p)-[oldScaleRel:RESONATES_IN_SCALE]->(:Scale)
          FOREACH (_ IN CASE WHEN $scaleRoot IS NOT NULL THEN [1] ELSE [] END | DELETE oldScaleRel)

          WITH p
          CALL {
              WITH p
              WITH p WHERE $scaleRoot IS NOT NULL AND $scaleKey IS NOT NULL
              MERGE (scale:Scale { root: $scaleRoot, scaleKey: $scaleKey })
              ON CREATE SET scale.name = $scaleName, scale.flavor = $scaleFlavor
              MERGE (p)-[:RESONATES_IN_SCALE { confidenceScore: $scaleScore }]->(scale)
              RETURN count(*) as scaleCount
          }

          RETURN p
        `, { 
          partitaUid: (existing as any).uid, 
          title: updates.title || null,
          status: updates.status || null, 
          instrument: updates.instrument || null,
          productId: updates.merchLink?.productId || null,
          scaleRoot: bestScale?.root || null,
          scaleKey: bestScale?.scaleKey || null,
          scaleName: bestScale?.scaleName || null,
          scaleFlavor: bestScale?.flavor || null,
          scaleScore: bestScale?.score || null
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
    const existing = await findEntityBySlugOrUid(PartitaModel, partitaUidOrSlug);
    if (!existing) throw new IlotError("Partition introuvable.", "NOT_FOUND", 404);

    const isAuthor = (existing as any).authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cette partition.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Partition", async (mongoSession, neo4jTx) => {
      const filesToDelete: string[] = [];
      const media = (existing as any).media;
      if (media?.coverImageUrl) filesToDelete.push(media.coverImageUrl);
      if (media?.audioTrackUrl) filesToDelete.push(media.audioTrackUrl);

      await neo4jTx.run(`MATCH (p:Partita { uid: $partitaUid }) DETACH DELETE p`, { partitaUid: (existing as any).uid });
      await PartitaModel.deleteOne({ uid: (existing as any).uid }, { session: mongoSession });

      return { success: true, purgedCount: 1, filesToDelete };
    });
  }
}