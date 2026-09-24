import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ISujet, CopyrightMetadata } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; 
import { NotificationOrchestrator } from './notification.orchestrator';
import { sanitizeCopyright, getCopyrightCypherRelation } from '../utils/copyright.engine'; // 🚀 Import du Helper DRY

interface IStorageManager {
  deleteFile(key: string): Promise<unknown>;
  extractKeyFromUrl(url: string): string;
}

export interface SujetSyncResult {
  success: boolean;
  status: string;
  mongo: ISujet | null;
  neo4j: import('neo4j-driver').QueryResult | null;
}

// Typage utilitaire pour autoriser des sous-objets partiels en entrée
type DeepPartialConnections = Partial<ISujet['connections']>;
type DeepPartialSettings = Partial<ISujet['settings']>;
type DeepPartialKosmic = Partial<ISujet['kosmicBoon']>;

export type FosterSujetPayload = Omit<Partial<ISujet>, 'resonance' | 'propagation' | 'connections' | 'settings' | 'kosmicBoon'> & {
  authorUid: string;
  title: string;     
  content: string;
  connections?: DeepPartialConnections;
  settings?: DeepPartialSettings;
  kosmicBoon?: DeepPartialKosmic;
  copyrightMetadata?: CopyrightMetadata; // 🚀
};

export type UpdateSujetPayload = Partial<Omit<ISujet, 'uid' | 'authorUid' | 'resonance' | 'connections' | 'propagation'>>;

const generateSlug = (text: string): string => {
  return text.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
};

/**
 * ✍️ SUJET ORCHESTRATOR
 * Gère la sédimentation d'une pensée dans la Silice (MongoDB) et son tissage dans le Graphe (Neo4j).
 */
export class SujetOrchestrator {
  private storageService: IStorageManager;
  private notificationOrchestrator: NotificationOrchestrator;

  constructor(customStorageService?: IStorageManager, notificationOrchestrator?: NotificationOrchestrator) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
  }
  
  /**
   * FONDATION : FORGER UN NŒUD DE PENSÉE (Sujet)
   */
  async fosterSujet(data: FosterSujetPayload, signature: ActionSignature): Promise<SujetSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour parler à la place d'un autre.", "FORBIDDEN", 403);
    }

    const txResult = await TransactionManager.execute("Fondation de Sujet", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      const sujetUid = data.uid || `sujet_${randomUUID()}`;
      const title = data.title;
      
      const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      const finalSlug = await ensureUniqueSlug(SujetModel, baseSlug, mongoSession);

      // ✨ OPTIMISATION UX/SEO : Génération automatique d'un extrait si absent
      const autoExcerpt = data.excerpt || (data.content && data.content.length > 150 
          ? `${data.content.substring(0, 147)}...` 
          : data.content);

      // 🛡️ Logique métier du Copyright et des Rôles centralisée
      const cpMeta = sanitizeCopyright(data.copyrightMetadata);

      const newSujetData: Partial<ISujet> = {
        ...data,
        uid: sujetUid,
        title: title,
        slug: finalSlug,
        excerpt: autoExcerpt, // Injection de l'extrait intelligent
        content: data.content || "",
        lyrics: data.lyrics || undefined,
        copyright: data.copyright || undefined,
        copyrightMetadata: cpMeta, // 🚀 Injecté propre et nettoyé
        authorUid: signature.actorUid,
        category: data.category || 'MONOLOGUE',
        status: data.status || 'DRAFT',
        tags: data.tags || [],
        connections: {
            relatedProjects: data.connections?.relatedProjects || [],
            relatedTasks: data.connections?.relatedTasks || [],
            relatedProducts: data.connections?.relatedProducts || [],
            relatedGames: data.connections?.relatedGames || [],
            crossLinks: data.connections?.crossLinks || []
        },
        merchLink: data.merchLink || undefined,
        media: data.media || undefined,
        settings: {
            allowComments: true,
            allowEmojiReactions: true,
            allowPropagation: true, 
            isAgeRestricted: false,
            alchemicalTransmuted: false,
            ...data.settings
        },
        propagation: {
            shareCount: 0,
            uniquePasseurs: 0,
            globalReach: 0
        },
        kosmicBoon: {
            interactionCount: data.kosmicBoon?.interactionCount || 0,
            nextKosmicBoon: data.kosmicBoon?.nextKosmicBoon || 42
        },
        lastCommentedAt: data.lastCommentedAt || undefined
      };

      // 1. SILICE (MongoDB)
      let newSujet: ISujet;
      try {
        const created = await SujetModel.create([newSujetData], { session: mongoSession });
        newSujet = created[0].toObject() as unknown as ISujet;
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000) {
          throw new IlotError("Collision critique de slug sur le sujet. Veuillez réitérer.", "CONFLICT", 409);
        }
        throw err;
      }

      // 2. GRAPHE (Neo4j) - Le Tissu Universel
      // 🌐 Génération dynamique du lien Cypher via le helper
      const relationType = getCopyrightCypherRelation(cpMeta.role);

      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sujet { 
           uid: $sujetUid, 
           title: $title, 
           slug: $slug,
           category: $category,
           status: $status,
           isExclusiveIlot: $isExclusiveIlot,
           createdAt: datetime($now),
           updatedAt: datetime($now)
        })
        CREATE (u)-[:${relationType} { notes: $sublimationNotes }]->(s)

        WITH s, u
        UNWIND (CASE WHEN size($crossLinks) > 0 THEN $crossLinks ELSE [null] END) AS link
        FOREACH (_ IN CASE WHEN link IS NOT NULL THEN [1] ELSE [] END |
          MERGE (target:Artifact { uid: link.entityId })
          MERGE (s)-[:RELATES_TO { app: link.entityType, intent: coalesce(link.label, 'reference') }]->(target)
        )

        WITH DISTINCT s, u
        FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
          MERGE (prod:Product {uid: $productId})
          MERGE (s)-[:OFFERS_PRODUCT]->(prod)
        )

        WITH DISTINCT s, u
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)
        RETURN s, collect(DISTINCT follower.uid) AS followerUids
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        sujetUid: newSujet.uid,
        title: newSujet.title,
        slug: newSujet.slug,
        category: newSujet.category,
        status: newSujet.status,
        crossLinks: newSujet.connections?.crossLinks || [],
        productId: newSujet.merchLink?.productId || null,
        isExclusiveIlot: cpMeta.isExclusiveIlot,
        sublimationNotes: cpMeta.sublimationNotes || '',
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, status: 'success', mongo: newSujet, neo4j: neoResult };
    });

    // 🌿 3. LA CANOPÉE TAMPON
    if (txResult.success && txResult.neo4j && txResult.mongo?.status === 'PUBLISHED') {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          const exclusiveBadge = txResult.mongo?.copyrightMetadata?.isExclusiveIlot ? ' ✨ [Exclusivité]' : '';

          Promise.allSettled(followerUids.map((uid: string) => 
            this.notificationOrchestrator.fosterNotification({
              recipientUid: uid,
              senderUid: signature.actorUid,
              category: 'TEXT',
              type: 'NEW_SUJET',
              payload: {
                title: `Nouvelle Pensée dans la matrice${exclusiveBadge}`,
                message: `L'Oiseau a sédimenté une nouvelle pensée : ${txResult.mongo?.title}`,
                targetUrl: `/abyss-blog/${txResult.mongo?.slug}`,
                targetUid: txResult.mongo?.uid,
                targetType: 'SUJET'
              }
            }, signature)
          )).catch(e => console.error("[Canopée] Erreur lors de la distribution des échos:", e));
        }
      }
    }

    return txResult;
  }

  /**
   * MUTATION : METTRE À JOUR UN SUJET
   */
  async updateSujet(sujetIdentifier: string, updates: UpdateSujetPayload, signature: ActionSignature): Promise<SujetSyncResult> {
    const existing = await findEntityBySlugOrUid(SujetModel, sujetIdentifier) as unknown as ISujet | null;
    if (!existing) throw new IlotError("Sujet introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres pensées.", "FORBIDDEN", 403);
    }

    const wasPublished = existing.status === 'PUBLISHED';
    const willBePublished = updates.status === 'PUBLISHED';
    const justPublished = !wasPublished && willBePublished;

    const txResult = await TransactionManager.execute("Mutation de Sujet", async (mongoSession, neo4jTx) => {
      const now = new Date();

      const finalUpdates = {
        ...updates,
        'dates.updatedAt': now
      };

      const updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: finalUpdates },
        { new: true, session: mongoSession }
      ).lean() as unknown as ISujet;

      let neoResult = null;
      const cypher = `
        MATCH (s:Sujet { uid: $sujetUid })
        SET s.title = coalesce($title, s.title),
            s.status = coalesce($status, s.status),
            s.category = coalesce($category, s.category),
            s.isExclusiveIlot = coalesce($isExclusiveIlot, s.isExclusiveIlot),
            s.updatedAt = datetime($now)
        
        WITH s
        OPTIONAL MATCH (s)-[r:OFFERS_PRODUCT]->(oldProd:Product)
        FOREACH (_ IN CASE WHEN $productId IS NULL AND r IS NOT NULL THEN [1] ELSE [] END | DELETE r)
        
        WITH s
        FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
          MERGE (newProd:Product {uid: $productId})
          MERGE (s)-[:OFFERS_PRODUCT]->(newProd)
        )

        WITH s
        MATCH (author:User { uid: $authorUid })
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(author)
        RETURN s, collect(DISTINCT follower.uid) AS followerUids
      `;

      const isExclusiveUpdate = updates.copyrightMetadata 
          ? (updates.copyrightMetadata as any).isExclusiveIlot 
          : null;

      neoResult = await neo4jTx.run(cypher, { 
        sujetUid: existing.uid, 
        authorUid: existing.authorUid,
        title: updates.title || null,
        status: updates.status || null, 
        category: updates.category || null,
        productId: updates.merchLink?.productId || null,
        isExclusiveIlot: isExclusiveUpdate,
        now: now.toISOString()
      });

      return { success: true, status: 'success', mongo: updatedSujet, neo4j: neoResult };
    });

    if (txResult.success && justPublished && txResult.neo4j) {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          Promise.allSettled(followerUids.map((uid: string) => 
            this.notificationOrchestrator.fosterNotification({
              recipientUid: uid,
              senderUid: signature.actorUid,
              category: 'TEXT',
              type: 'NEW_SUJET',
              payload: {
                title: "Pensée publiée dans la matrice",
                message: `L'Oiseau a publié un nouveau monologue : ${txResult.mongo?.title}`,
                targetUrl: `/abyss-blog/${txResult.mongo?.slug}`,
                targetUid: txResult.mongo?.uid,
                targetType: 'SUJET'
              }
            }, signature)
          )).catch(e => console.error("[Canopée] Erreur lors de la distribution des échos sur update:", e));
        }
      }
    }

    return txResult;
  }

  /**
   * DÉSINTÉGRATION : PURGER UN SUJET
   */
  async disintegrateSujet(sujetIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const existing = await findEntityBySlugOrUid(SujetModel, sujetIdentifier) as unknown as ISujet | null;
    if (!existing) throw new IlotError("Sujet introuvable.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler ce texte.", "FORBIDDEN", 403);
    }

    const result = await TransactionManager.execute("Désintégration de Sujet", async (mongoSession, neo4jTx) => {
      await neo4jTx.run(`MATCH (s:Sujet { uid: $sujetUid }) DETACH DELETE s`, { sujetUid: existing.uid });
      await SujetModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });

    if (result.success) {
      const media = existing.media as { coverImageUrl?: string; audioTrackUrl?: string } | undefined;
      const deletePromises = [];
      
      const safeDelete = async (url: string) => {
        try {
          const key = this.storageService.extractKeyFromUrl(url);
          await this.storageService.deleteFile(key);
        } catch (error) {
          console.warn(`[Orchestrator] Échec non-bloquant de la purge du média S3/R2 pour l'URL: ${url}`);
        }
      };

      if (media?.coverImageUrl) {
        deletePromises.push(safeDelete(media.coverImageUrl));
      }
      if (media?.audioTrackUrl) {
        deletePromises.push(safeDelete(media.audioTrackUrl));
      }
      
      await Promise.allSettled(deletePromises);
    }

    return result;
  }
}