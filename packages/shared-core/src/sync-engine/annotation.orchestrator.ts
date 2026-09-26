import { UniversalAnnotationModel, OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, AnnotationTargetType, ICreateUniversalAnnotationInput } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { resolveCanonicalUid, safeSyncUniversalInteraction } from '../utils/orchestrator.engine';
import { NotificationOrchestrator } from './notification.orchestrator';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

export interface AnnotationSyncResult {
  success: boolean;
  status: string;
  mongo: unknown;
  neo4j: QueryResult | null;
  [key: string]: unknown;
}

/**
 * ANNOTATION ORCHESTRATOR
 * Gère le système universel de surlignage, de notes et de fulgurances.
 * Agnostique : fonctionne sur les Livres (Bibliotek), les Articles (Abyss) et les Commentaires.
 */
export class AnnotationOrchestrator {
  private notificationOrchestrator: NotificationOrchestrator;

  constructor(notificationOrchestrator?: NotificationOrchestrator) {
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
  }

  /**
   * FONDATION : SCELLEMENT D'UNE ANNOTATION / FULGURANCE
   */
  public async fosterAnnotation(
    data: ICreateUniversalAnnotationInput,
    signature: ActionSignature
  ): Promise<AnnotationSyncResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour apposer une note.", "UNAUTHORIZED", 401);
    }

    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    return await TransactionManager.execute("Sédimentation d'Annotation", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();
      const annotationUid = `annot_${randomUUID()}`;

      // 1. Sédimentation dans la Silice (MongoDB)
      const newAnnotationData = {
        ...data,
        uid: annotationUid,
        authorUid: actorCanonicalUid,
        isScholarSealed: false,
        createdAt: now,
        updatedAt: now
      };

      const [newAnnotation] = await UniversalAnnotationModel.create([newAnnotationData], { session: mongoSession });

      // 2. Déduction du Label Neo4j cible
      let targetLabel = 'Artifact';
      if (data.targetType === 'BOOK') targetLabel = 'LibraryBook';
      else if (data.targetType === 'ARTICLE') targetLabel = 'Sujet';
      else if (data.targetType === 'COMMENT') targetLabel = 'Comment';

      // 3. Tissage dans le Graphe (Neo4j)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        MATCH (target:${targetLabel} { uid: $targetUid })
        CREATE (u)-[r:ANNOTATED {
            uid: $annotUid,
            emotion: $emotion,
            importance: $importance,
            createdAt: datetime($now)
        }]->(target)
        WITH r, target
        OPTIONAL MATCH (target)<-[:CREATED|COMPOSED|WROTE|FOUNDED|WROTE_COMMENT]-(owner:User)
        RETURN r, owner.uid AS targetOwnerUid LIMIT 1
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: actorCanonicalUid,
        targetUid: data.targetUid,
        annotUid: annotationUid,
        emotion: data.emotion || null,
        importance: data.importance || 1,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Cible introuvable dans la Matrice Neo4j.", "NOT_FOUND", 404);
      }

      const targetOwnerUid = neoResult.records[0].get('targetOwnerUid') as string | null;

      // 4. Notifications et Interactions (Asynchrone et Sécurisé)
      if (targetOwnerUid && targetOwnerUid !== actorCanonicalUid) {
        // Enregistre l'interaction karmique globale
        await safeSyncUniversalInteraction(actorCanonicalUid, targetOwnerUid, 'RESONANCE', 'fosterAnnotation');

        // Envoi de la notification au propriétaire de la cible
        try {
          await this.notificationOrchestrator.fosterNotification({
            recipientUid: targetOwnerUid,
            senderUid: actorCanonicalUid,
            category: 'RESONANCE',
            type: 'NEW_ANNOTATION',
            payload: {
              title: "Nouvelle Résonance",
              message: `Un Oiseau a laissé une trace sur votre œuvre : "${data.selectedText.substring(0, 30)}..."`,
              targetUid: data.targetUid,
              targetType: data.targetType
            }
          }, { actorUid: 'system', capabilities: [] });
        } catch (e) {
          console.error("[Canopée] Erreur notification d'annotation:", e);
        }
      }

      return {
        success: true,
        status: 'success',
        mongo: newAnnotation,
        neo4j: neoResult
      };
    });
  }

  /**
   * LE SCEAU DE L'ÉRUDIT (Prestige décerné par l'auteur de la cible)
   */
  public async toggleScholarSeal(
    annotationUid: string,
    isSealed: boolean,
    signature: ActionSignature
  ): Promise<{ success: boolean; isScholarSealed: boolean }> {
    if (!signature.actorUid) throw new IlotError("Identité requise.", "UNAUTHORIZED", 401);

    const actorCanonicalUid = await resolveCanonicalUid(OiseauModel, signature.actorUid, "Oiseau acteur");

    return await TransactionManager.execute("Sceau de l'Érudit Universel", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // 1. Récupération de l'annotation dans MongoDB
      const annotation = await UniversalAnnotationModel.findOne({ uid: annotationUid }).session(mongoSession);
      if (!annotation) throw new IlotError("Annotation introuvable.", "NOT_FOUND", 404);

      // 2. Vérification d'Aura via le Graphe : L'acteur est-il bien le créateur de la cible ?
      if (!signature.capabilities.includes('*')) {
        const checkCypher = `
          MATCH (target {uid: $targetUid})<-[:CREATED|COMPOSED|WROTE|FOUNDED|WROTE_COMMENT]-(owner:User {uid: $actorUid})
          RETURN owner.uid AS ownerUid
        `;
        const checkResult = await neo4jTx.run(checkCypher, {
          targetUid: annotation.targetUid,
          actorUid: actorCanonicalUid
        });

        if (checkResult.records.length === 0) {
          throw new IlotError("Seul l'auteur de l'œuvre ciblée peut décerner le Sceau de l'Érudit.", "FORBIDDEN", 403);
        }
      }

      // 3. Application du Sceau
      annotation.isScholarSealed = isSealed;
      annotation.updatedAt = new Date();
      await annotation.save({ session: mongoSession });

      // 4. Notification gratifiante à l'auteur de l'annotation
      if (isSealed && annotation.authorUid !== actorCanonicalUid) {
        try {
          await this.notificationOrchestrator.fosterNotification({
            recipientUid: annotation.authorUid,
            senderUid: actorCanonicalUid,
            category: 'RESONANCE',
            type: 'SCHOLAR_SEAL_AWARDED',
            payload: {
              title: "Sceau de l'Érudit Obtenu !",
              message: `Votre réflexion a été élevée au rang de Note d'Érudit pour la postérité.`,
              targetUid: annotation.targetUid,
              targetType: annotation.targetType
            }
          }, { actorUid: 'system', capabilities: [] });
        } catch (e) {
          console.error("[Canopée] Échec de l'envoi de la notification érudit:", e);
        }
      }

      return { success: true, isScholarSealed: isSealed };
    });
  }

  /**
   * DÉSINTÉGRATION : PURGER UNE ANNOTATION
   */
  public async disintegrateAnnotation(annotationUid: string, signature: ActionSignature): Promise<{ success: boolean }> {
    return await TransactionManager.execute("Désintégration d'Annotation", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const annotation = await UniversalAnnotationModel.findOne({ uid: annotationUid }).session(mongoSession);
      if (!annotation) throw new IlotError("Annotation introuvable.", "NOT_FOUND", 404);

      // Vérification des droits : Auteur de la note, ou Architecte
      const isAuthor = annotation.authorUid === signature.actorUid;
      const isRoot = signature.capabilities.includes('*');

      if (!isAuthor && !isRoot) {
        // En dernier recours, l'auteur de l'œuvre cible a aussi le droit de purger une note sur son mur.
        const checkOwnerCypher = `
          MATCH (target {uid: $targetUid})<-[:CREATED|COMPOSED|WROTE|FOUNDED|WROTE_COMMENT]-(owner:User {uid: $actorUid})
          RETURN owner.uid
        `;
        const checkResult = await neo4jTx.run(checkOwnerCypher, {
          targetUid: annotation.targetUid,
          actorUid: signature.actorUid
        });

        if (checkResult.records.length === 0) {
          throw new IlotError("Souveraineté violée. Tu ne peux pas détruire cette trace.", "FORBIDDEN", 403);
        }
      }

      // 1. Purge du Graphe
      await neo4jTx.run(`MATCH ()-[r:ANNOTATED { uid: $annotUid }]->() DELETE r`, { annotUid: annotation.uid });

      // 2. Purge de la Silice
      await UniversalAnnotationModel.deleteOne({ uid: annotation.uid }, { session: mongoSession });

      return { success: true };
    });
  }
}