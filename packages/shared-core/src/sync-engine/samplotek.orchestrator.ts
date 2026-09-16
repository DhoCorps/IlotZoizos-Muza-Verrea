import { SampleModel, PartitaModel, UniversalMediaRegistry } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine'; // 👈 Utilisation du moteur interne

export interface SamplotekSyncResult {
  success: boolean;
  status: string;
  mongo: any; // Type souple et compatible avec les documents Mongoose
  neo4j: import('neo4j-driver').QueryResult;
}

/**
 * SAMPLOTEK ORCHESTRATOR
 * Gère la sédimentation des samples (E-Jay) et le mixage final.
 * Applique le tissage Neo4j avec un typage strict.
 */
export class SamplotekOrchestrator {
  
  /**
   * 💽 GRAVER UN NOUVEAU SAMPLE
   */
  async fosterSample(data: Record<string, unknown>, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour graver un sample.", "UNAUTHORIZED", 401);
    }

    if (!data.title || !data.audioUrl || !data.digitalSignature) {
      throw new IlotError("Données de sample incomplètes ou non scellées.", "BAD_REQUEST", 400);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Fondation Sample", async (mongoSession, neo4jTx) => {
      const sampleUid = (data.uid as string) || `samp_${randomUUID()}`;

      // Sécurisation de l'unicité du slug dans la Silice
      const baseSlug = generateSlug((data.slug as string) || (data.title as string)); // 👈 Changement ici
      let finalSlug = baseSlug;
      let slugExists = await SampleModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await SampleModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      const newSampleData = {
        ...data,
        uid: sampleUid,
        slug: finalSlug,
        creatorUid: actorCanonicalUid
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newSample] = await SampleModel.create([newSampleData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) avec MATCH strict
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sample {
           uid: $sampleUid,
           title: $title,
           slug: $slug,
           tempoBpm: $tempoBpm,
           style: $style,
           digitalSignature: $digitalSignature,
           createdAt: datetime()
        })
        CREATE (u)-[:GRAVED]->(s)
        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        sampleUid: newSample.uid,
        title: newSample.title,
        slug: newSample.slug,
        tempoBpm: (newSample as any).tempoBpm || 120,
        style: (newSample as any).style || 'Ambient',
        digitalSignature: newSample.digitalSignature
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
  async exportProject(data: Record<string, unknown>, signature: ActionSignature): Promise<SamplotekSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour mixer un projet.", "UNAUTHORIZED", 401);
    }
    const tracks = data.tracks as unknown[];
    if (!data.title || !tracks || tracks.length === 0) {
      throw new IlotError("Un projet E-Jay nécessite un titre et au moins une piste active.", "BAD_REQUEST", 400);
    }

    const actorCanonicalUid = signature.actorUid;

    return await TransactionManager.execute("Exportation Studio", async (mongoSession, neo4jTx) => {
      const projectUid = (data.uid as string) || `samplotek_${randomUUID()}`;

      // Sécurisation de l'unicité du slug
      const baseSlug = generateSlug((data.slug as string) || (data.title as string)); // 👈 Changement ici
      let finalSlug = baseSlug;
      let slugExists = await PartitaModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await PartitaModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      // 1. Sédimentation comme "Partition" dans MongoDB
      const [newProject] = await PartitaModel.create([{
        uid: projectUid,
        slug: finalSlug,
        title: data.title,
        authorUid: actorCanonicalUid,
        status: 'PUBLISHED',
        type: 'SAMPLOTEK_PROJECT',
        content: JSON.stringify({ bpm: data.bpm, tracks: data.tracks }),
        instrument: 'SAMPLOTEK',
        metadata: data.metadata
      }], { session: mongoSession });

      // 2. Tissage dans Neo4j avec liens vers les samples utilisés (Héritage)
      const metadataObj = data.metadata as Record<string, unknown> | undefined;
      const usedSampleUids = (metadataObj?.usedSampleUids as string[]) || [];
      
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (p:Partita {
           uid: $projectUid,
           title: $title,
           slug: $slug,
           type: 'SAMPLOTEK_PROJECT',
           createdAt: datetime()
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
        sampleUids: usedSampleUids
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage du projet dans Neo4j.", "INTERNAL_ERROR", 500);
      }

      // 3. Indexation Universelle si autorisé (Intègre le composant au Diaporama Agora)
      const permissions = metadataObj?.permissions as Record<string, boolean> | undefined;
      if (permissions?.allowShowcase) {
        await UniversalMediaRegistry.indexItem({
          mediaId: newProject.uid,
          sourceApp: 'PARTITA',
          ownerUid: actorCanonicalUid,
          ownerSlug: (data.authorSlug as string) || actorCanonicalUid,
          title: data.title as string,
          mediaUrl: '',
          consentForShowcase: true,
          consentForMusicSync: permissions.allowRadio,
          createdAt: new Date(),
          metadata: { isStudioProject: true }
        });
      }

      return { success: true, status: 'success', mongo: newProject, neo4j: neoResult };
    });
  }
}