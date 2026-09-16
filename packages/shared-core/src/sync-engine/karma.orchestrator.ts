import { OiseauModel, ReportModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class KarmaOrchestrator {
  /**
   * Utilitaire interne pour résoudre strictement l'UID canonique via l'utilitaire global.
   */
  private async resolveCanonicalUid(identifier: string): Promise<string> {
    const user = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!user) throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    return (user as any).uid;
  }

  /**
   * ⚖️ SÉLECTION DES JURÉS (Le Tribunal de la Canopée)
   * Trouve N oiseaux sans aucun lien de 1er ou 2nd degré avec les parties prenantes.
   */
  public async summonImpartialJurors(plaintiffId: string, defendantId: string, count: number = 5) {
    const plaintiffUid = await this.resolveCanonicalUid(plaintiffId);
    const defendantUid = await this.resolveCanonicalUid(defendantId);

    return await TransactionManager.execute("Convocation du Tribunal", async (_mongoSession, neo4jTx) => {
      const cypher = `
        MATCH (u:User)
        WHERE u.uid <> $plaintiffUid AND u.uid <> $defendantUid
          AND NOT (u)-[:INTERACTS_WITH*1..2]-( {uid: $plaintiffUid} )
          AND NOT (u)-[:INTERACTS_WITH*1..2]-( {uid: $defendantUid} )
          AND u.karmaStatus = 'clear'
        RETURN u.uid AS jurorUid
        ORDER BY rand()
        LIMIT toInteger($count)
      `;
      
      const result = await neo4jTx.run(cypher, { plaintiffUid, defendantUid, count });
      const jurors = result.records.map(record => record.get('jurorUid'));

      if (jurors.length < 3) {
        throw new IlotError("Impossible de réunir un Tribunal impartial. Pas assez d'Oiseaux neutres.", "INTERNAL_ERROR", 500);
      }

      return { success: true, jurors };
    });
  }

  /**
   * ⚡ EXÉCUTION DE LA SENTENCE & BOUCLIER KARMIQUE
   */
  public async executeJudgmentSanction(
    targetIdentifier: string,
    reportUid: string,
    judgmentLevel: 1 | 2 | 3,
    signature: ActionSignature
  ) {
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.MEMBER.EXILE)) {
      throw new IlotError("Aura insuffisante pour faire s'abattre le KaÔdZ.", "FORBIDDEN", 403);
    }

    const targetCanonicalUid = await this.resolveCanonicalUid(targetIdentifier);

    return await TransactionManager.execute("Sentence Karmique", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();

      const targetUser = await OiseauModel.findOne({ uid: targetCanonicalUid }).session(mongoSession);
      if (!targetUser) throw new IlotError("Accusé introuvable.", "NOT_FOUND", 404);

      // 🛡️ Typage élargi à 0 pour accepter l'annulation par le bouclier des Grâces
      let appliedLevel: 0 | 1 | 2 | 3 = judgmentLevel;
      let usedGrace = false;

      const PRAISE_THRESHOLD_FOR_GRACE = 10; 
      if ((judgmentLevel === 1 || judgmentLevel === 2) && targetUser.gracesUsed < 3) {
        if (targetUser.praisesCount >= PRAISE_THRESHOLD_FOR_GRACE) {
          targetUser.gracesUsed += 1;
          appliedLevel = 0; 
          usedGrace = true;
          console.log(`✨ [Tribunal] L'Oiseau ${targetCanonicalUid} a brûlé une Grâce dorée (Reste: ${3 - targetUser.gracesUsed}).`);
        }
      }

      if (appliedLevel > 0) {
        targetUser.strikes += 1;
      }

      let newKarmaStatus = targetUser.karmaStatus;
      if (appliedLevel === 1) newKarmaStatus = 'muted';
      else if (appliedLevel === 2) newKarmaStatus = 'quarantined';
      else if (appliedLevel === 3) newKarmaStatus = 'banned';

      targetUser.karmaStatus = newKarmaStatus;
      if (appliedLevel === 3) targetUser.accountStatus = 'EXILED';
      targetUser.updatedAt = now;

      await targetUser.save({ session: mongoSession });

      // Mise à jour sécurisée du rapport via le modèle ReportModel centralisé
      await ReportModel.findOneAndUpdate(
        { uid: reportUid },
        { $set: { status: 'sanctioned', 'dates.updatedAt': now } },
        { session: mongoSession }
      );

      const cypher = `
        MATCH (u:User {uid: $uid})
        SET u.karmaStatus = $karmaStatus,
            u.strikes = $strikes,
            u.gracesUsed = $gracesUsed,
            u.updatedAt = datetime($now)
        RETURN u
      `;
      await neo4jTx.run(cypher, {
        uid: targetCanonicalUid,
        karmaStatus: newKarmaStatus,
        strikes: targetUser.strikes,
        gracesUsed: targetUser.gracesUsed,
        now: now.toISOString()
      });

      return {
        success: true,
        targetUid: targetCanonicalUid,
        appliedLevel,
        usedGrace,
        newKarmaStatus,
        strikes: targetUser.strikes,
        gracesRemaining: 3 - targetUser.gracesUsed
      };
    });
  }
}