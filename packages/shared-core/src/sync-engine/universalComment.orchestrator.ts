import { UniversalCommentModel, SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { UniversalComment, ActionSignature, CommentTargetType } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export interface CommentSyncResult {
  success: boolean;
  isJackpot: boolean;
  mongo: UniversalComment | null;
  neo4j: import('neo4j-driver').QueryResult | null;
}

export type FosterCommentPayload = {
  targetUid: string;
  targetType: CommentTargetType;
  parentId?: string;
  content: string;
};

/**
 * 🌟 UNIVERSAL COMMENT ORCHESTRATOR
 * Gère le Moteur de Résonance : Validation de l'acte d'amour (Reaction), 
 * écriture du Commentaire, et tirage de la Faveur du Kosmos (Gacha).
 */
export class UniversalCommentOrchestrator {
  
  /**
   * FONDATION : ÉMETTRE UNE RÉSONANCE (Commentaire)
   */
  async fosterComment(data: FosterCommentPayload, signature: ActionSignature): Promise<CommentSyncResult> {
    return await TransactionManager.execute("Émission de Résonance", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      // 1. RÈGLE D'OR : VÉRIFICATION DE LA RÉACTION (Pas d'amour = pas de parole)
      // On cherche si l'Avatar a émis une relation [:REACTED_TO] vers la cible.
      const reactionCheck = await neo4jTx.run(`
        MATCH (u { uid: $actorUid })-[r:REACTED_TO]->(t { uid: $targetUid })
        RETURN r LIMIT 1
      `, { actorUid: signature.actorUid, targetUid: data.targetUid });

      if (reactionCheck.records.length === 0) {
        throw new IlotError(
          "Le droit de critiquer s'achète par un acte d'amour. Vous devez réagir à l'œuvre avant de pouvoir commenter.", 
          "FORBIDDEN", 
          403
        );
      }

      // 2. FORGE DANS LA SILICE (MongoDB)
      const commentUid = `comment_${randomUUID()}`;
      const newCommentData: Partial<UniversalComment> = {
        uid: commentUid,
        authorUid: signature.actorUid,
        targetUid: data.targetUid,
        targetType: data.targetType,
        parentId: data.parentId || undefined,
        content: data.content,
        allowComments: true,
        allowReactions: true,
        isHidden: false,
        isScholarSealed: false // Le Sceau de l'Érudit est toujours faux à la création
      };

      const created = await UniversalCommentModel.create([newCommentData], { session: mongoSession });
      const newComment = created[0] as unknown as UniversalComment;

      // 3. TISSAGE DANS LE GRAPHE (Neo4j)
      const cypherWrite = `
        MATCH (u { uid: $actorUid }), (t { uid: $targetUid })
        CREATE (c:Comment { 
           uid: $commentUid, 
           targetType: $targetType,
           createdAt: datetime($now) 
        })
        CREATE (u)-[:WROTE_COMMENT]->(c)-[:ATTACHED_TO]->(t)
        RETURN c
      `;

      const neoResult = await neo4jTx.run(cypherWrite, {
        actorUid: signature.actorUid,
        targetUid: data.targetUid,
        commentUid: newComment.uid,
        targetType: data.targetType,
        now: now.toISOString()
      });

      // 4. LA FAVEUR DU KOSMOS (Mécanique Gacha & Fraîcheur SEO)
      let isJackpot = false;
      
      // On récupère le document maître (Le Patron) pour incrémenter le Gacha.
      // (Si le commentaire cible un autre commentaire, cette requête renverra null en silence, ce qui est voulu)
      const targetArtifact = await SujetModel.findOne({ uid: data.targetUid }).session(mongoSession);

      if (targetArtifact && targetArtifact.kosmicBoon) {
        targetArtifact.kosmicBoon.interactionCount += 1;
        
        // Tirage du Jackpot
        if (targetArtifact.kosmicBoon.interactionCount >= targetArtifact.kosmicBoon.nextKosmicBoon) {
          isJackpot = true;
          // Calcule le prochain palier secret (actuel + un saut aléatoire entre 10 et 100)
          const randomJump = Math.floor(Math.random() * 90) + 10;
          targetArtifact.kosmicBoon.nextKosmicBoon = targetArtifact.kosmicBoon.interactionCount + randomJump;
        }

        // Fraîcheur SEO : on met à jour la date du dernier commentaire
        targetArtifact.lastCommentedAt = now;
        await targetArtifact.save({ session: mongoSession });
      }

      return { success: true, isJackpot, mongo: newComment, neo4j: neoResult };
    });
  }

  /**
   * INVISIBILITÉ KOSMIQUE : RENDRE OCCULTE UN COMMENTAIRE (Masquer)
   */
  async occultComment(commentUid: string, signature: ActionSignature): Promise<{ success: boolean }> {
    const existing = await UniversalCommentModel.findOne({ uid: commentUid }) as UniversalComment | null;
    if (!existing) throw new IlotError("Écho introuvable.", "NOT_FOUND", 404);

    if (existing.authorUid !== signature.actorUid && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur peut occulter sa propre parole.", "FORBIDDEN", 403);
    }

    await UniversalCommentModel.findOneAndUpdate(
      { uid: commentUid },
      { $set: { isHidden: true } }
    );

    return { success: true };
  }

  /**
   * LE GOUFFRE DU NOUN : DÉSINTÉGRER UN COMMENTAIRE (Supprimer)
   */
  async disintegrateComment(commentUid: string, signature: ActionSignature): Promise<{ success: boolean }> {
    const existing = await UniversalCommentModel.findOne({ uid: commentUid }) as UniversalComment | null;
    if (!existing) throw new IlotError("Écho introuvable.", "NOT_FOUND", 404);

    if (existing.authorUid !== signature.actorUid && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou l'administration peut détruire ce nœud.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration de Résonance", async (mongoSession, neo4jTx) => {
      // Neo4j : DETACH DELETE va détruire le commentaire ET toutes les relations attachées 
      // (ce qui nettoiera l'arbre orphelin)
      await neo4jTx.run(`MATCH (c:Comment { uid: $uid }) DETACH DELETE c`, { uid: commentUid });
      
      // Mongo : Suppression du document
      await UniversalCommentModel.deleteOne({ uid: commentUid }, { session: mongoSession });

      return { success: true };
    });
  }
}