// packages/shared-core/src/sync-engine/samplotek.orchestrator.ts
import { 
  SampleModel, 
  PartitaModel, 
  UniversalMediaRegistry,
  UniversHallBeaconModel,
  LedgerEntryModel 
} from '@ilot/infrastructure';
import { ISample, IPartita } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { ensureUniqueSlug } from '../utils/orchestrator.engine';

export interface SamplotekSyncResult {
  success: boolean;
  status: string;
  mongo?: ISample | IPartita | any;
  neo4j?: import('neo4j-driver').QueryResult;
  isQuarantined?: boolean;
}

export interface FosterSamplePayload {
  uid?: string;
  title: string;
  slug?: string;
  audioUrl: string;
  cryptoSeal: {
    digitalSignature: string;
    timestampedAt: Date;
    copyrightMetadata?: any;
  };
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
      allowBlindTest?: boolean;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * SAMPLOTEK ORCHESTRATOR
 * Gère la sédimentation des samples (E-Jay), le mixage final, la modération et l'économie passive.
 */
export class SamplotekOrchestrator {

  /**
   * 💽 GRAVER UN NOUVEAU SAMPLE
   */
  async fosterSample(data: FosterSamplePayload, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour graver un sample.", "UNAUTHORIZED", 401);
    }

    if (!data.title || !data.audioUrl || !data.cryptoSeal?.digitalSignature) {
      throw new IlotError("Données de sample incomplètes ou Sceau Cryptographique manquant.", "BAD_REQUEST", 400);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Fondation Sample", async (mongoSession, neo4jTx) => {
      const now = new Date();
      const sampleUid = data.uid || `samp_${randomUUID()}`;

      const baseSlug = generateSlug(data.slug || data.title);
      const finalSlug = await ensureUniqueSlug(SampleModel, baseSlug, mongoSession);

      const newSampleData = {
        ...data,
        uid: sampleUid,
        slug: finalSlug,
        authorUid: actorCanonicalUid,
        cryptoSeal: data.cryptoSeal,
        createdAt: now,
        updatedAt: now
      };

      // 1. Sédimentation dans la Silice
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
        CREATE (u)-[:GRAVED_SAMPLE]->(s)
        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        sampleUid: newSample.uid,
        title: newSample.title,
        slug: newSample.slug,
        tempoBpm: newSample.tempoBpm || 120,
        style: newSample.style || 'Ambient',
        digitalSignature: newSample.cryptoSeal!.digitalSignature,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans Neo4j.", "NOT_FOUND", 404);
      }

      return { success: true, status: 'success', mongo: newSample, neo4j: neoResult };
    });
  }

  /**
   * 🚩 MODÉRATION : SIGNALER UN SAMPLE
   */
  async reportSample(sampleUid: string, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour signaler un sample.", "UNAUTHORIZED", 401);
    }

    return await TransactionManager.execute("Signalement Sample", async (mongoSession) => {
      const sample = await SampleModel.findOne({ uid: sampleUid }).session(mongoSession);
      if (!sample) {
        throw new IlotError("Sample introuvable dans la matrice.", "NOT_FOUND", 404);
      }

      const currentReports = sample.moderation?.reportsCount || 0;
      const newReports = currentReports + 1;
      const shouldQuarantine = newReports > 3;

      sample.moderation = {
        reportsCount: newReports,
        isQuarantined: shouldQuarantine
      };

      if (shouldQuarantine) {
        sample.status = 'QUARANTINED';
        console.warn(`[MODÉRATION] Le sample ${sampleUid} a été placé en quarantaine par la communauté.`);
      }

      await sample.save({ session: mongoSession });

      return { success: true, status: 'success', mongo: sample, isQuarantined: shouldQuarantine };
    });
  }

  /**
   * 🎛️ EXPORTER UN PROJET STUDIO (MIXAGE & ROYALTIES)
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

      // 2. Tissage dans Neo4j & Extraction des Ayants Droit (Royalties)
      const usedSampleUids = data.metadata?.usedSampleUids || [];
      
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
          MERGE (p)-[:CONTAINS_SAMPLE_FROM]->(s)
        )
        WITH p
        OPTIONAL MATCH (author:User)-[:GRAVED_SAMPLE]->(s2:Sample)<-[:CONTAINS_SAMPLE_FROM]-(p)
        WHERE author.uid <> $actorUid
        RETURN p, collect(DISTINCT author.uid) AS royaltyBeneficiaries
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

      // 3. Versement de l'Économie Passive (Kompta) - Schéma stricte
      const royaltyBeneficiaries = neoResult.records[0].get('royaltyBeneficiaries') || [];
      if (royaltyBeneficiaries.length > 0) {
        const ledgerEntries = royaltyBeneficiaries.map((beneficiaryUid: string) => {
          const entryUid = `ldg_${randomUUID()}`;
          return {
            entryUid: entryUid,
            ownerUid: beneficiaryUid,
            counterpartyUid: 'SYSTEM', // Les royalties sont générées par la Canopée
            amountCents: 500, // 5.00 Vinyles
            currency: 'VINYLE',
            type: 'CREDIT', // Comptabilité stricte
            category: 'REWARD', 
            referenceUid: newProject.uid,
            entryHash: `hash_seal_${entryUid}`, // Sceau unique pour le Grand Livre
            description: `Économie Passive : Votre sample a été utilisé dans l'œuvre "${newProject.title}".`,
            status: 'COMPLETED',
            createdAt: now
          };
        });
        await LedgerEntryModel.create(ledgerEntries, { session: mongoSession });
      }

      // 4. Inscription Univers'Hall (Balise d'Agora)
      await UniversHallBeaconModel.create([{
        uid: `beacon_${newProject.uid}`,
        sourceModule: 'SAMPLOTEK',
        entityUid: newProject.uid,
        title: newProject.title,
        summary: `Nouvelle symphonie SamploTek composée de ${usedSampleUids.length} samples.`,
        tags: ['samplotek', 'musique', 'mix'],
        resonanceScore: 10,
        metadata: { isStudioProject: true },
        createdAt: now
      }], { session: mongoSession });

      // 5. Indexation Universelle si autorisé
      const permissions = data.metadata?.permissions;
      if (permissions?.allowShowcase) {
        await UniversalMediaRegistry.indexItem({
          mediaId: newProject.uid,
          sourceApp: 'PARTITA',
          ownerUid: actorCanonicalUid,
          ownerSlug: data.authorSlug || actorCanonicalUid,
          title: data.title,
          mediaUrl: '',
          consentForShowcase: true,
          consentForMusicSync: permissions?.allowRadio,
          createdAt: now,
          metadata: { isStudioProject: true }
        });
      }

      return { success: true, status: 'success', mongo: newProject, neo4j: neoResult };
    });
  }
}