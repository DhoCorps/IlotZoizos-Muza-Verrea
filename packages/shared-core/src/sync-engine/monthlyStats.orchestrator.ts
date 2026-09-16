import { TransactionManager } from './transactionManager';
import { KomptaStatsEngine } from './komptaStats.orchestrator';
import { RewardEntryModel, OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature, CAPABILITIES } from '@ilot/types';

// Interface d'injection pour isoler le shared-core de l'application
export interface IMessageManager {
  sendSystemNewsletter(payload: any): Promise<any>;
  sendMessage(payload: any): Promise<any>;
}

export class MonthlyStatsOrchestrator {
  private messageService: IMessageManager;

  constructor(customMessageService?: IMessageManager) {
    // Par défaut (pour les tests), on injecte un mock silencieux
    this.messageService = customMessageService || {
      sendSystemNewsletter: async () => ({ success: true }),
      sendMessage: async () => ({ success: true })
    };
  }

  /**
   * 🌙 LE RITUEL DE LA MOISSON MENSUELLE
   * S'exécute par défaut le 1er du mois à 03:00.
   * Calcule les métriques, forge les titres honorifiques et distribue la Sève
   */
  public async executeMonthlyHarvest(yearMonth: string, signature: ActionSignature) {
    // Seul le système souverain (*) ou un Architecte peut déclencher la moisson globale
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL)) {
      throw new IlotError("Aura insuffisante pour invoquer le Rituel de la Moisson.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Moisson de la Canopée", async (mongoSession, neo4jTx) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now' pour toute l'exécution de la moisson
      const now = new Date();

      // 1. Extraction des flux énergétiques de la Silice
      const stats = await KomptaStatsEngine.calculateMonthlyStats(yearMonth);
      const awardedRewards: any[] = [];

      // 2. FORGE DES TITRES HONORIFIQUES ET RÉCOMPENSES ÉVOCATRICES
      // L'Alchimiste de Valeur (Top Vendeur / Créateur de Richesse)
      if (stats.topSellers.length > 0) {
        awardedRewards.push({
          ownerUid: stats.topSellers[0].uid,
          type: 'ALCHIMISTE_DE_VALEUR',
          month: yearMonth,
          isTradable: true,
          isConsumed: false,
          createdAt: now,
          updatedAt: now,
          metadata: { renewallBonus: 'SILICE_GOLD_BOOST', multiplier: 1.5, aura: 'Lumière Créatrice' }
        });
      }

      // Le Mécène de l'Aube (Top Acheteur / Injecteur de Sève)
      if (stats.topBuyers.length > 0) {
        awardedRewards.push({
          ownerUid: stats.topBuyers[0].uid,
          type: 'MECENE_DE_L_AUBE',
          month: yearMonth,
          isTradable: true,
          isConsumed: false,
          createdAt: now,
          updatedAt: now,
          metadata: { renewallBonus: 'LUCK_FACTOR_BOOST', rate: 1.3, aura: 'Vent Porteur' }
        });
      }

      // La Voix de l'Abîme (L'Oiseau le plus commenté)
      if (stats.mostCommented.length > 0) {
        awardedRewards.push({
          ownerUid: stats.mostCommented[0]._id,
          type: 'VOIX_DE_L_ABIME',
          month: yearMonth,
          isTradable: false,
          isConsumed: false,
          createdAt: now,
          updatedAt: now,
          metadata: { renewallBonus: 'EXTENDED_CHAT_RANGE', radius: 50, aura: 'Écho Profond' }
        });
      }

      // L'Étincelle Symbiotique (L'Oiseau le plus réactif/empathique)
      if (stats.mostReactive.length > 0) {
        awardedRewards.push({
          ownerUid: stats.mostReactive[0]._id,
          type: 'ETINCELLE_SYMBIOTIQUE',
          month: yearMonth,
          isTradable: false,
          isConsumed: false,
          createdAt: now,
          updatedAt: now,
          metadata: { renewallBonus: 'KARMA_SHIELD', charges: 3, aura: 'Chaleur Partagée' }
        });
      }

      // 3. Persistance Documentaire (Silice)
      if (awardedRewards.length > 0) {
        await RewardEntryModel.insertMany(awardedRewards, { session: mongoSession });
      }

      // 4. Sédimentation dans le Graphe (Neo4j) - Phase 2 : MATCH STRICT sur UID Canonique
      for (const reward of awardedRewards) {
        const cypher = `
          MATCH (u:User {uid: $ownerUid})
          CREATE (r:MonthlyReward {
            type: $type,
            month: $month,
            aura: $aura,
            awardedAt: datetime($now)
          })
          CREATE (u)-[:EARNED_REWARD]->(r)
        `;
        await neo4jTx.run(cypher, {
          ownerUid: reward.ownerUid,
          type: reward.type,
          month: yearMonth,
          aura: reward.metadata?.aura || 'Mystère',
          now: now.toISOString()
        });
      }

      // 5. CHRONIQUE DE L'ÎLOT : La Newsletter évocatrice
      const fiatVolume = stats.macroTotals['EUR']?.totalVolume || 0;
      const kaosVolume = stats.macroTotals['KAOS_ORGANIQUE']?.totalVolume || 0;
      const transactions = Object.values(stats.macroTotals).reduce((sum, curr) => sum + curr.transactionCount, 0);

      const newsletterContent = `
        La lune a achevé son cycle sur l'Îlot Zoizos pour ce mois de ${yearMonth}.
        
        L'écosystème palpite d'une vitalité rare : ${transactions} flux organiques ont traversé nos racines.
        Le Trésor de la Canopée a vu circuler ${(fiatVolume / 100).toFixed(2)} éclats fiduciaires et a été irrigué par ${kaosVolume} unités de Kaos Organique pur.
        
        Les esprits de l'Îlot ont honoré leurs champions. Vérifiez vos nids, de nouveaux artéfacts et auras vous attendent peut-être.
        Que la Sève continue de couler.
      `;

      await this.messageService.sendSystemNewsletter({
        targetAudience: 'ALL',
        subject: `📢 Chronique de la Canopée - Cycle de ${yearMonth}`,
        content: newsletterContent.trim(),
        statsSnapshot: stats
      });

      // 6. MESSAGES PRIVÉS : Chuchotements aux Lauréats (avec résolution unifiée)
      const rewardedUids = Array.from(new Set(awardedRewards.map(r => r.ownerUid)));

      // ⚡ Parallélisation massive de l'envoi des messages
      await Promise.all(
        rewardedUids.map(async (uid) => {
          try {
            const oiseau = await findEntityBySlugOrUid(OiseauModel, uid);
            if (!oiseau) return;

            const userRewards = awardedRewards.filter(r => r.ownerUid === uid);
            const auras = userRewards.map(r => r.metadata?.aura).join(' et ');

            await this.messageService.sendMessage({
              conversationSlug: `private-${uid}`,
              senderSlug: 'SYSTEM_CANOPY_ROOT',
              content: `L'Îlot a entendu ton chant. Pour ce cycle de ${yearMonth}, tu as été adoubé(e) et l'aura "${auras}" t'enveloppe désormais. Tes récompenses symbiotiques ont été liées dans ton inventaire de Silice.`,
              attachments: [],
              replyToSlug: ''
            });
          } catch (err) {
            console.error(`  [Orchestrator] Échec de l'envoi du message privé au lauréat ${uid} :`, err);
          }
        })
      );

      return {
        success: true,
        yearMonth,
        distributedRewardsCount: awardedRewards.length
      };
    });
  }
}