// packages/shared-core/src/sync-engine/monthly.stats.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { KomptaStatsEngine } from './komptaStats.orchestrator';
import { RewardEntryModel } from '../../../infrastructure/src/database/models/nosql/reward.model';
import { MessageService } from '../../../../apps/hub-central/modules/messaging/message.service';
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature, CAPABILITIES } from '@ilot/types';

export class MonthlyStatsOrchestrator {
  /**
   * 🌙 EXÉCUTION DE LA MOISSON MENSUELLE (Cron de nuit ou appel sécurisé Architecte)
   * S'exécute par défaut le 1er du mois à 03:00.
   */
  public async executeMonthlyHarvest(yearMonth: string, signature: ActionSignature) {
    // Seul le système souverain (*) ou un Architecte peut déclencher la moisson globale
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL)) {
      throw new IlotError("Aura insuffisante pour déclencher la moisson mensuelle de la canopée.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Moisson Mensuelle et Récompenses Renewall", async (mongoSession, neo4jTx) => {
      // 1. Calcul des statistiques globales du mois
      const stats = await KomptaStatsEngine.calculateMonthlyStats(yearMonth);

      const awardedRewards: any[] = [];

      // 2. Attribution des trophées et des actifs troquables pour Renewall
      // Attribuer au Top Vendeur
      if (stats.topSellers.length > 0) {
        const topSellerUid = stats.topSellers[0]._id;
        awardedRewards.push({
          ownerUid: topSellerUid,
          type: 'TOP_SELLER',
          month: yearMonth,
          isTradable: true,
          isConsumed: false,
          metadata: { renewallBonus: 'SILICE_GOLD_BOOST', multiplier: 1.5 }
        });
      }

      // Attribuer à l'Oiseau Écho (Plus commenté)
      if (stats.mostCommented.length > 0) {
        const echoUid = stats.mostCommented[0]._id;
        awardedRewards.push({
          ownerUid: echoUid,
          type: 'MOST_COMMENTED',
          month: yearMonth,
          isTradable: true,
          isConsumed: false,
          metadata: { renewallBonus: 'EXTENDED_CHAT_RANGE', radius: 50 }
        });
      }

      // Attribuer à l'Oiseau Réactif
      if (stats.mostReactive.length > 0) {
        const reactiveUid = stats.mostReactive[0]._id;
        awardedRewards.push({
          ownerUid: reactiveUid,
          type: 'MOST_REACTIVE',
          month: yearMonth,
          isTradable: true,
          isConsumed: false,
          metadata: { renewallBonus: 'LUCK_FACTOR_BOOST', rate: 1.2 }
        });
      }

      // Sauvegarde des récompenses troquables dans la Silice
      if (awardedRewards.length > 0) {
        await RewardEntryModel.insertMany(awardedRewards, { session: mongoSession });
      }

      // 3. Propagation relationnelle dans le Graphe Neo4j (Archivage des trophées du mois)
      for (const reward of awardedRewards) {
        const cypher = `
          MATCH (u:User {uid: $ownerUid})
          CREATE (r:MonthlyReward {
            type: $type,
            month: $month,
            awardedAt: datetime()
          })
          CREATE (u)-[:EARNED_REWARD]->(r)
        `;
        await neo4jTx.run(cypher, {
          ownerUid: reward.ownerUid,
          type: reward.type,
          month: yearMonth
        });
      }

      // 4. Passage de la passerelle vers la messagerie interne (Newsletter de la Canopée globale)
      await MessageService.sendSystemNewsletter({
        targetAudience: 'ALL',
        subject: `🗞️ Newsletter de la Canopée & Bilan de ${yearMonth}`,
        content: `La lune a veillé sur l'Îlot. Le volume global des échanges s'élève à ${(stats.macroTotals.totalVolumeCents / 100).toFixed(2)} € (${stats.macroTotals.transactionCount} transactions). Les trophées et actifs pour Renewall ont été distribués !`,
        statsSnapshot: stats
      });

      // 5. OPTION DE FINITION PROPRE : Envoi de bilans personnalisés ciblés aux lauréats
      // Récupération unique des UIDs uniques de tous les oiseaux récompensés ce mois-ci
      const rewardedUids = Array.from(new Set(awardedRewards.map(r => r.ownerUid)));
      
      for (const uid of rewardedUids) {
        const oiseau = await OiseauModel.findOne({ uid }).session(mongoSession).lean();
        if (!oiseau) continue;

        const userRewards = awardedRewards.filter(r => r.ownerUid === uid);
        const rewardNames = userRewards.map(r => r.type).join(', ');

        // Injection d'un message direct privé dans la boîte de réception de l'oiseau
        await MessageService.sendMessage({
          conversationSlug: `private-${uid}`,
          senderSlug: 'SYSTEM_CANOPY_ROOT',
          content: `🌟 Félicitations ! Pour ce mois de ${yearMonth}, tu as décroché les distinctions : [${rewardNames}]. Tes actifs troquables pour le jeu Renewall t'attendent dans ton inventaire de Silice.`,
          attachments: [],
          replyToSlug: ''
        });
      }

      console.log(`[Canopy Harvest] 🌙 Moisson du mois de ${yearMonth} scellée avec succès dans la Silice et la Matrice.`);

      return {
        success: true,
        yearMonth,
        distributedRewardsCount: awardedRewards.length,
        macroTotals: stats.macroTotals
      };
    });
  }
}