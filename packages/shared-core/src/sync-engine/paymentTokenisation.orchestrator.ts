// packages/shared-core/src/sync-engine/payment.tokenization.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';

export interface TokenizePaymentPayload {
  userUid: string;
  externalCustomerId: string;      // Token client externe sécurisé
  defaultPaymentMethodId: string;  // Token du moyen de paiement par défaut
}

export class PaymentTokenizationOrchestrator {
  /**
   * 🛡️ ENREGISTREMENT SÉCURISÉ DES RÉFÉRENCES DE PAIEMENT (Tokenisation Externe)
   * Associe les identifiants tokenisés de la passerelle de paiement à l'Oiseau, 
   * garantissant qu'aucune donnée bancaire brute ne transite ni ne se stocke en base.
   */
  public async linkExternalPaymentProfile(
    payload: TokenizePaymentPayload,
    signature: ActionSignature
  ): Promise<{ success: boolean; userUid: string; hasActiveWallet: boolean }> {

    // Sécurité : Seul l'Oiseau concerné ou un Administrateur suprême peut lier ses paiements
    const isSelf = signature.actorUid === payload.userUid;
    const isArchitect = signature.capabilities.includes('*');

    if (!isSelf && !isArchitect) {
      throw new IlotError("Aura insuffisante pour lier un profil de paiement externe.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Tokenisation de Paiement Externe", async (mongoSession, neo4jTx) => {
      
      // 1. Recherche de l'oiseau dans la Silice
      const user = await OiseauModel.findOne({ uid: payload.userUid }).session(mongoSession);
      if (!user) {
        throw new IlotError("Oiseau introuvable dans la Silice.", "NOT_FOUND", 404);
      }

      // 2. Mise à jour sécurisée avec uniquement les tokens de référence externe
      const updatedUser = await OiseauModel.findOneAndUpdate(
        { uid: payload.userUid },
        {
          $set: {
            'paymentProfile': {
              externalCustomerId: payload.externalCustomerId,
              defaultPaymentMethodId: payload.defaultPaymentMethodId,
              hasActiveWallet: true,
              updatedAt: new Date()
            }
          }
        },
        { new: true, session: mongoSession }
      ).lean();

      // 3. Propagation optionnelle dans le Graphe Neo4j pour lier l'entité de paiement si nécessaire
      const cypher = `
        MATCH (u:User {uid: $userUid})
        SET u.hasActiveWallet = true,
            u.externalCustomerId = $externalCustomerId,
            u.updatedAt = datetime()
        RETURN u.uid AS uid
      `;

      await neo4jTx.run(cypher, {
        userUid: payload.userUid,
        externalCustomerId: payload.externalCustomerId
      });

      console.log(`[Kompta/Payment] 🔒 Références de paiement tokenisées enregistrées avec succès pour l'oiseau : ${payload.userUid}`);

      return {
        success: true,
        userUid: payload.userUid,
        hasActiveWallet: true
      };
    });
  }
}