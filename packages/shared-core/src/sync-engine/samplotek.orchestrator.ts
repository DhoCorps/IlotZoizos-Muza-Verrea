import { SampleModel, PartitaModel, UniversalMediaRegistry } from '@ilot/infrastructure';
import { ISample, IPartita } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié

export interface SamplotekSyncResult {
  success: boolean;
  status: string;
  mongo: ISample | IPartita;
  neo4j: import('neo4j-driver').QueryResult;
}

export interface FosterSamplePayload {
  uid?: string;
  title: string;
  slug?: string;
  audioUrl: string;
  digitalSignature: string;
  tempoBpm?: number;
  style?: string;
  [key: string]: unknown;
}

export interface ExportProjectPayload {
  uid?: string;
  title: string;
  slug?: string;
  tracks: unknown[];
  bpm?: number;
  authorSlug?: string;
  metadata?: {
    usedSampleUids?: string[];
    permissions?: {
      allowShowcase?: boolean;
      allowRadio?: boolean;
      allowBlindTest?: boolean; // 🛡️ Ajout indispensable ici pour stopper l'erreur TypeScript
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * SAMPLOTEK ORCHESTRATOR
 * Gère la sédimentation des samples (E-Jay) et le mixage final.
 * Applique le tissage Neo4j avec un typage strict et une unicité atomique anti-concurrence.
 */
export class SamplotekOrchestrator {

  /**
   * 💽 GRAVER UN NOUVEAU SAMPLE
   */
  async fosterSample(data: FosterSamplePayload, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour graver un sample.", "UNAUTHORIZED", 401);
    }

    if (!data.title || !data.audioUrl || !data.digitalSignature) {
      throw new IlotError("Données de sample incomplètes ou non scellées.", "BAD_REQUEST", 400);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Fondation Sample", async (mongoSession, neo4jTx) => {
      const now = new Date();
      const sampleUid = data.uid || `samp_${randomUUID()}`;

      // Sécurisation atomique de l'unicité du slug via l'utilitaire global
      const baseSlug = generateSlug(data.slug || data.title);
      const finalSlug = await ensureUniqueSlug(SampleModel, baseSlug, mongoSession);

      const newSampleData = {
        ...data,
        uid: sampleUid,
        slug: finalSlug,
        creatorUid: actorCanonicalUid,
        dates: {
          createdAt: now,
          updatedAt: now
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB) avec gestion gracieuse de l'unicité (Retry pattern minimaliste)
      let newSample: ISample;
      try {
        const created = await SampleModel.create([newSampleData], { session: mongoSession });
        newSample = created[0] as unknown as ISample;
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000) {
          throw new IlotError("Collision critique de slug sur le sample. Veuillez réitérer.", "CONFLICT", 409);
        }
        throw err;
      }

      // 2. Tissage dans le Graphe (Neo4j)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sample {
           uid: $sampleUid,
           title: $title,
           slug: $slug,
           tempoBpm: $tempoBpm,
           style: $style,
           digitalSignature: $digitalSignature,
           createdAt: datetime($now)
        })
        CREATE (u)-[:GRAVED]->(s)
        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        sampleUid: newSample.uid,
        title: newSample.title,
        slug: newSample.slug,
        tempoBpm: newSample.tempoBpm || 120,
        style: newSample.style || 'Ambient',
        digitalSignature: newSample.digitalSignature,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans Neo4j.", "NOT_FOUND", 404);
      }

      return { success: true, status: 'success', mongo: newSample, neo4j: neoResult };
    });
  }

  /**
   * 🎛️ EXPORTER UN PROJET STUDIO (MIXAGE)
   */
  async exportProject(data: ExportProjectPayload, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour mixer un projet.", "UNAUTHORIZED", 401);
    }
    const tracks = data.tracks;
    if (!data.title || !tracks || tracks.length === 0) {
      throw new IlotError("Un projet E-Jay nécessite un titre et au moins une piste active.", "BAD_REQUEST", 400);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Exportation Studio", async (mongoSession, neo4jTx) => {
      const now = new Date();
      const projectUid = data.uid || `samplotek_${randomUUID()}`;

      // Sécurisation atomique de l'unicité du slug de projet via l'utilitaire global
      const baseSlug = generateSlug(data.slug || data.title);
      const finalSlug = await ensureUniqueSlug(PartitaModel, baseSlug, mongoSession);

      // 1. Sédimentation comme "Partition" dans MongoDB
      let newProject: IPartita;
      try {
        const createdProject = await PartitaModel.create([{
          uid: projectUid,
          slug: finalSlug,
          title: data.title,
          authorUid: actorCanonicalUid,
          status: 'PUBLISHED',
          type: 'SAMPLOTEK_PROJECT',
          content: JSON.stringify({ bpm: data.bpm, tracks: data.tracks }),
          instrument: 'SAMPLOTEK',
          metadata: data.metadata,
          dates: {
            createdAt: now,
            updatedAt: now
          }
        }], { session: mongoSession });
        newProject = createdProject[0] as unknown as IPartita;
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000) {
          throw new IlotError("Collision de slug détectée sur le projet studio.", "CONFLICT", 409);
        }
        throw err;
      }

      // 2. Tissage dans Neo4j
      const metadataObj = data.metadata;
      const usedSampleUids = metadataObj?.usedSampleUids || [];
      
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (p:Partita {
           uid: $projectUid,
           title: $title,
           slug: $slug,
           type: 'SAMPLOTEK_PROJECT',
           createdAt: datetime($now)
        })
        CREATE (u)-[:COMPOSED]->(p)
        WITH p
        UNWIND (CASE WHEN size($sampleUids) = 0 THEN [null] ELSE $sampleUids END) AS sUid
        FOREACH (_ IN CASE WHEN sUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (s:Sample {uid: sUid})
          MERGE (p)-[:USES_SAMPLE]->(s)
        )
        RETURN p
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        projectUid: newProject.uid,
        title: newProject.title,
        slug: newProject.slug,
        sampleUids: usedSampleUids,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage du projet dans Neo4j.", "INTERNAL_ERROR", 500);
      }

      // 3. Indexation Universelle si autorisé
      const permissions = metadataObj?.permissions;
      if (permissions?.allowShowcase) {
        await UniversalMediaRegistry.indexItem({
          mediaId: newProject.uid,
          sourceApp: 'PARTITA',
          ownerUid: actorCanonicalUid,
          ownerSlug: data.authorSlug || actorCanonicalUid,
          title: data.title,
          mediaUrl: '',
          consentForShowcase: true,
          consentForMusicSync: permissions.allowRadio,
          createdAt: now,
          metadata: { isStudioProject: true }
        });
      }

      return { success: true, status: 'success', mongo: newProject, neo4j: neoResult };
    });
  }
}