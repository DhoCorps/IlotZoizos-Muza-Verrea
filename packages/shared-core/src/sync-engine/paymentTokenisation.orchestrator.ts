import { OiseauModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature } from '@ilot/types';
import { resolveCanonicalUid } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié

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

    // 1. Barrière d'Aura : Seul l'Oiseau concerné ou l'Architecte peut forger ce lien
    const isSelf = signature.actorUid === payload.userUid;
    const isArchitect = signature.capabilities.includes('*');

    if (!isSelf && !isArchitect) {
      throw new IlotError("Aura insuffisante pour lier un profil de paiement externe.", "FORBIDDEN", 403);
    }

    if (!payload.externalCustomerId || !payload.defaultPaymentMethodId) {
      throw new IlotError("Tokens de paiement manquants ou corrompus.", "BAD_REQUEST", 400);
    }

    // 2. Résolution Canonique avant ouverture de transaction via l'utilitaire global
    const canonicalUid = await resolveCanonicalUid(OiseauModel, payload.userUid, "Oiseau");

    return await TransactionManager.execute("Tokenisation de Paiement Externe", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();
      
      // 3. Sédimentation Documentaire : Mise à jour sécurisée avec uniquement les tokens et l'horodatage synchronisé
      const updatedUser = await OiseauModel.findOneAndUpdate(
        { uid: canonicalUid },
        {
          $set: {
            'paymentProfile': {
              externalCustomerId: payload.externalCustomerId,
              defaultPaymentMethodId: payload.defaultPaymentMethodId,
              hasActiveWallet: true,
              updatedAt: now
            },
            'dates.updatedAt': now
          }
        },
        { new: true, session: mongoSession }
      ).lean();

      // 4. Propagation dans le Graphe Neo4j via l'index strict et la date unifiée
      const cypher = `
        MATCH (u:User {uid: $canonicalUid})
        SET u.hasActiveWallet = true,
            u.externalCustomerId = $externalCustomerId,
            u.updatedAt = datetime($now)
        RETURN u.uid AS uid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        canonicalUid,
        externalCustomerId: payload.externalCustomerId,
        now: now.toISOString()
      });

      // 🛡️ VERROU DE SÉCURITÉ : Vérification de l'existence dans la Matrice
      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du scellement : Oiseau introuvable dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      // Censure des logs : On ne loggue JAMAIS les tokens, même externes
      console.log(`[Kompta/Payment] 🔒 Profil de paiement tokenisé enregistré avec succès pour l'oiseau : ${canonicalUid}`);

      return {
        success: true,
        userUid: canonicalUid,
        hasActiveWallet: true
      };
    });
  }
}