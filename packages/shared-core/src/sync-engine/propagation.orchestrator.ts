import { ShareEventModel, SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ShareEvent, ActionSignature, PropagationScope } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';

export interface PropagationSyncResult {
  success: boolean;
  mongo: ShareEvent | null;
  neo4j: import('neo4j-driver').QueryResult | null;
}

export type PropagatePayload = {
  artifactUid: string;
  artifactType: 'BLOG' | 'PROJECT' | 'FONT' | 'SPRITE' | 'PROFILE' | 'GAME' | 'LYRIKA' | 'SAMPLOTEK' | 'BIBLIOTEK' | 'POETRIK';
  scope: PropagationScope;
  receiverUids?: string[];
  customMessage?: string;
};

/**
 * 🌊 PROPAGATION ORCHESTRATOR
 * Gère le flux viral organique : Tisse les relations de partage dans Neo4j,
 * enregistre l'événement dans MongoDB, et gère les Ratios de Retour (Les "Mercis").
 */
export class PropagationOrchestrator {
  
  /**
   * PROPAGER UN ÉCHO (Partager une œuvre)
   */
  async propagateArtifact(data: PropagatePayload, signature: ActionSignature): Promise<PropagationSyncResult> {
    // Validation primaire de la cohérence Scope / Receivers avant même d'ouvrir une transaction
    if (data.scope === 'TARGETED' && (!data.receiverUids || data.receiverUids.length === 0)) {
        throw new IlotError("Un partage ciblé exige au moins un destinataire.", "BAD_REQUEST", 400);
    }
    if (data.scope === 'GLOBAL' && data.receiverUids && data.receiverUids.length > 0) {
        throw new IlotError("Un partage global ne peut avoir de destinataires spécifiques.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Propagation d'Artefact", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      // 1. FORGE DE L'ÉVÉNEMENT DANS LA SILICE (MongoDB)
      const newShareData: Partial<ShareEvent> = {
        sourceUid: signature.actorUid,
        artifactUid: data.artifactUid,
        artifactType: data.artifactType,
        scope: data.scope,
        receiverUids: data.receiverUids || [],
        customMessage: data.customMessage,
        metrics: { merciCount: 0, noiseCount: 0, returnRatio: 0 }
      };

      const created = await ShareEventModel.create([newShareData], { session: mongoSession });
      const newShareEvent = created[0] as unknown as ShareEvent;

      // 2. TISSAGE DANS LE GRAPHE (Neo4j)
      // On crée la relation [:SHARED] entre l'Oiseau et l'Œuvre.
      // Si c'est TARGETED, on crée en plus les relations [:SENT_TO] vers les destinataires.
      const cypherWrite = `
        MATCH (source:User { uid: $sourceUid }), (artifact:Artifact { uid: $artifactUid })
        
        // La trace indélébile du partage
        CREATE (source)-[s:SHARED { 
            shareId: $shareId, 
            scope: $scope, 
            timestamp: datetime($now) 
        }]->(artifact)

        WITH source, artifact, s
        
        // Si Ciblé, on tisse les fils vers les récepteurs
        UNWIND (CASE WHEN size($receiverUids) > 0 THEN $receiverUids ELSE [null] END) AS targetUid
        FOREACH (_ IN CASE WHEN targetUid IS NOT NULL THEN [1] ELSE [] END |
          MERGE (target:User { uid: targetUid })
          MERGE (source)-[:SENT_TO { shareId: $shareId, artifactUid: $artifactUid }]->(target)
        )

        RETURN s
      `;

      const neoResult = await neo4jTx.run(cypherWrite, {
        sourceUid: signature.actorUid,
        artifactUid: data.artifactUid,
        shareId: newShareEvent.uid,
        scope: data.scope,
        receiverUids: data.receiverUids || [],
        now: now.toISOString()
      });

      // 3. MISE À JOUR DES MÉTRIQUES DE L'ŒUVRE ORIGINELLE (Le Sujet)
      // Pour l'instant, on suppose que c'est un Sujet (ABYSS-BLOG). 
      // À étendre via un switch(data.artifactType) si on gère d'autres collections Mongo.
      if (data.artifactType === 'BLOG') {
          const targetSujet = await SujetModel.findOne({ uid: data.artifactUid }).session(mongoSession);
          if (targetSujet && targetSujet.propagation) {
              targetSujet.propagation.shareCount += 1;
              // Calcul simplifié pour l'exemple. Dans la réalité, il faudrait vérifier 
              // si sourceUid est un "nouveau" passeur unique pour cette œuvre.
              targetSujet.propagation.globalReach += (data.scope === 'GLOBAL' ? 10 : (data.receiverUids?.length || 0));
              await targetSujet.save({ session: mongoSession });
          }
      }

      return { success: true, mongo: newShareEvent, neo4j: neoResult };
    });
  }

  /**
   * LA GRATITUDE : REMERCIER UN PASSEUR (Impacte le Ratio de Retour)
   */
  async thankPasseur(shareId: string, signature: ActionSignature): Promise<{ success: boolean }> {
    return await TransactionManager.execute("Gratitude du Kosmos", async (mongoSession, neo4jTx) => {
        const shareEvent = await ShareEventModel.findOne({ uid: shareId }).session(mongoSession);
        
        if (!shareEvent) throw new IlotError("Événement de partage introuvable.", "NOT_FOUND", 404);
        if (shareEvent.sourceUid === signature.actorUid) {
             throw new IlotError("On ne peut se remercier soi-même.", "BAD_REQUEST", 400);
        }

        // 1. Tissage de la Gratitude dans Neo4j
        // On vérifie que la relation n'existe pas déjà pour éviter le spam de mercis
        const cypherThanks = `
            MATCH (receiver:User { uid: $receiverUid }), (source:User { uid: $sourceUid })
            WHERE NOT (receiver)-[:THANKED_FOR { shareId: $shareId }]->(source)
            CREATE (receiver)-[:THANKED_FOR { shareId: $shareId, timestamp: datetime() }]->(source)
            RETURN source
        `;

        const neoResult = await neo4jTx.run(cypherThanks, {
            receiverUid: signature.actorUid,
            sourceUid: shareEvent.sourceUid,
            shareId: shareEvent.uid
        });

        if (neoResult.records.length === 0) {
            throw new IlotError("Gratitude déjà exprimée ou passeur introuvable.", "CONFLICT", 409);
        }

        // 2. Mise à jour du Ratio de Retour dans MongoDB
        shareEvent.metrics.merciCount += 1;
        
        const totalInteractions = shareEvent.metrics.merciCount + shareEvent.metrics.noiseCount;
        if (totalInteractions > 0) {
            shareEvent.metrics.returnRatio = Number((shareEvent.metrics.merciCount / totalInteractions).toFixed(2));
        }

        await shareEvent.save({ session: mongoSession });

        return { success: true };
    });
  }
}