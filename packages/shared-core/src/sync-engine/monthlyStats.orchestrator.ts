import { TransactionManager } from './transactionManager';
import { KomptaStatsEngine } from './komptaStats.orchestrator';
import { RewardEntryModel, OiseauModel, findEntityBySlugOrUid, PageViewModel } from '@ilot/infrastructure';
import { IlotError } from '../errors/ilot.errors';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import type { ClientSession } from 'mongoose';
import type { Transaction } from 'neo4j-driver';

// ==========================================
// INTERFACES DE DÉPENDANCE & ÉVÈNEMENTS
// ==========================================
export interface IMessageManager {
  sendSystemNewsletter(payload: NewsletterPayload): Promise<unknown>;
  sendMessage(payload: PrivateMessagePayload): Promise<unknown>;
  [key: string]: unknown;
}

// 🚀 NOUVEAU : Interface pour le bus d'évènements (Pub/Sub)
export interface IEventPublisher {
  emit(eventName: string, payload: unknown): void;
}

export interface HarvestCompletedEvent {
  yearMonth: string;
  stats: any; // Type issu de MonthlyCanopyStats
  awardedRewards: RewardEntryPayload[];
}

export interface NewsletterPayload {
  targetAudience: string;
  subject: string;
  content: string;
  statsSnapshot: unknown;
  [key: string]: unknown;
}

export interface PrivateMessagePayload {
  conversationSlug: string;
  senderSlug: string;
  content: string;
  attachments: unknown[];
  replyToSlug: string;
  [key: string]: unknown;
}

export interface RewardMetadata {
  renewallBonus?: string;
  multiplier?: number;
  rate?: number;
  radius?: number;
  charges?: number;
  aura?: string;
  [key: string]: unknown;
}

export interface RewardEntryPayload {
  ownerUid: string;
  type: string;
  month: string;
  isTradable: boolean;
  isConsumed: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: RewardMetadata;
  [key: string]: unknown;
}

export interface MonthlyHarvestResult {
  success: boolean;
  yearMonth: string;
  distributedRewardsCount: number;
  [key: string]: unknown;
}

interface IOiseauEntity {
  uid: string;
  [key: string]: unknown;
}

export interface TrafficDataPoint {
  date: string;
  visitors: number;
  pageViews: number;
}

export interface StoreTrafficStats {
  storeUid: string;
  yearMonth: string;
  dailyTraffic: TrafficDataPoint[];
  historicalMonthlyTraffic: TrafficDataPoint[];
}

// ==========================================
// L'ORCHESTRATEUR PRINCIPAL
// ==========================================
export class MonthlyStatsOrchestrator {
  private eventPublisher: IEventPublisher;

  constructor(customEventPublisher?: IEventPublisher) {
    // Par défaut, un bus silencieux si non fourni
    this.eventPublisher = customEventPublisher || {
      emit: () => {}
    };
  }

  /**
   * 🌙 LE RITUEL DE LA MOISSON MENSUELLE
   * S'exécute par défaut le 1er du mois à 03:00.
   * Calcule les métriques, forge les titres honorifiques et émet l'évènement de fin.
   */
  public async executeMonthlyHarvest(yearMonth: string, signature: ActionSignature): Promise<MonthlyHarvestResult> {
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL)) {
      throw new IlotError("Aura insuffisante pour invoquer le Rituel de la Moisson.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Moisson de la Canopée", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      const now = new Date();

      // 1. Extraction des flux énergétiques de la Silice
      const stats = await KomptaStatsEngine.calculateMonthlyStats(yearMonth);
      const awardedRewards: RewardEntryPayload[] = [];

      // 2. FORGE DES TITRES HONORIFIQUES ET RÉCOMPENSES ÉVOCATRICES
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

      // 4. Sédimentation dans le Graphe (Neo4j)
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

      // 5. 🚀 ASYNCHRONISME : Émission de l'évènement de fin de moisson (Fire & Forget)
      // Délègue la charge réseau (emails/messages) aux écouteurs en arrière-plan
      this.eventPublisher.emit('CANOPY_HARVEST_COMPLETED', {
        yearMonth,
        stats,
        awardedRewards
      });

      return {
        success: true,
        yearMonth,
        distributedRewardsCount: awardedRewards.length
      };
    });
  }

  /**
   * 📊 Récupère l'analytique de trafic d'une boutique (ERP).
   */
  public async getStoreTraffic(storeUid: string, yearMonth: string): Promise<StoreTrafficStats> {
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new IlotError(`Format de mois invalide : "${yearMonth}". Attendu : "YYYY-MM".`, "BAD_REQUEST", 400);
    }

    const startDate = new Date(`${yearMonth}-01T00:00:00.000Z`);
    
    const [yearStr, monthStr] = yearMonth.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);
    
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const endDate = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00.000Z`);
    
    let histMonth = month - 6;
    let histYear = year;
    if (histMonth <= 0) {
      histMonth += 12;
      histYear -= 1;
    }
    const historicalStartDate = new Date(`${histYear}-${String(histMonth).padStart(2, '0')}-01T00:00:00.000Z`);

    const dailyAggregation = await PageViewModel.aggregate([
      { $match: { storeUid, createdAt: { $gte: startDate,$lt: endDate } } },
      { $group: { 
          _id: { $dateToString: { format: "\%Y-\%m-\%d", date: "$createdAt" } }, 
          visitors: { $addToSet: "$visitorUid" },
          pageViews: { $sum: 1 }                 } },       {$sort: { _id: 1 } }
    ]);

    const monthlyAggregation = await PageViewModel.aggregate([
      { $match: { storeUid, createdAt: { $gte: historicalStartDate,$lt: endDate } } },
      { $group: { 
          _id: { $dateToString: { format: "\%Y-\%m", date: "$createdAt" } }, 
          visitors: { $addToSet: "$visitorUid" }, 
          pageViews: { $sum: 1 }                 } },       {$sort: { _id: 1 } }
    ]);

    const mapAggregation = (agg: any[]) => agg.map(item => ({
      date: item._id,
      visitors: Array.isArray(item.visitors) ? item.visitors.length : 0,
      pageViews: item.pageViews
    }));

    return {
      storeUid,
      yearMonth,
      dailyTraffic: mapAggregation(dailyAggregation),
      historicalMonthlyTraffic: mapAggregation(monthlyAggregation)
    };
  }
}

// ==========================================
// L'ÉCOUTEUR D'ÉVÈNEMENTS (BACKGROUND LISTENER)
// ==========================================
export class CanopyHarvestNotificationListener {
  private messageService: IMessageManager;

  constructor(messageService: IMessageManager) {
    this.messageService = messageService;
  }

  /**
   * 🎧 Consomme l'évènement 'CANOPY_HARVEST_COMPLETED' en arrière-plan.
   */
  public async handleHarvestCompleted(event: HarvestCompletedEvent): Promise<void> {
    const { yearMonth, stats, awardedRewards } = event;

    try {
      // 1. CHRONIQUE DE L'ÎLOT : La Newsletter évocatrice
      const fiatVolume = stats.macroTotals?.['EUR']?.totalVolume || 0;
      const kaosVolume = stats.macroTotals?.['KAOS_ORGANIQUE']?.totalVolume || 0;
      const transactions = Object.values(stats.macroTotals || {}).reduce((sum: number, curr: any) => sum + (curr.transactionCount || 0), 0);

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

      // 2. MESSAGES PRIVÉS : Chuchotements aux Lauréats
      const rewardedUids = Array.from(new Set(awardedRewards.map(r => r.ownerUid)));

      await Promise.all(
        rewardedUids.map(async (uid) => {
          try {
            const oiseau = await findEntityBySlugOrUid(OiseauModel, uid) as unknown as IOiseauEntity | null;
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
          } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : String(err);
            console.error(`  [NotificationListener] Échec message privé lauréat ${uid} :`, errMessage);
          }
        })
      );
    } catch (err) {
      console.error("  [NotificationListener] Échec global du traitement des notifications de moisson :", err);
    }
  }
}