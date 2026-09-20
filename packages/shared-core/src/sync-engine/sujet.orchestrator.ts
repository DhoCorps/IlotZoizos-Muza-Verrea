import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ISujet } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; 

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

// Typage strict : On omet 'resonance' et 'propagation' qui sont gérées dynamiquement par le système
export type FosterSujetPayload = Omit<Partial<ISujet>, 'resonance' | 'propagation' | 'connections' | 'settings' | 'kosmicBoon'> & {
  authorUid: string;
  title: string;     
  content: string;
  // On redéfinit explicitement ces objets comme partiels pour l'entrée
  connections?: DeepPartialConnections;
  settings?: DeepPartialSettings;
  kosmicBoon?: DeepPartialKosmic;
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

  constructor(customStorageService?: IStorageManager) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
  }
  
  /**
   * FONDATION : FORGER UN NŒUD DE PENSÉE (Sujet)
   */
  async fosterSujet(data: FosterSujetPayload, signature: ActionSignature): Promise<SujetSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
        throw new IlotError("Aura insuffisante pour parler à la place d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Fondation de Sujet", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      const sujetUid = data.uid || `sujet_${randomUUID()}`;
      const title = data.title;
      
      const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      const finalSlug = await ensureUniqueSlug(SujetModel, baseSlug, mongoSession);

      // On prépare l'objet complet pour Mongo avec intégration de la Propagation et du Gacha
      const newSujetData: Partial<ISujet> = {
        ...data,
        uid: sujetUid,
        title: title,
        slug: finalSlug,
        content: data.content || "",
        lyrics: data.lyrics || undefined,
        copyright: data.copyright || undefined,
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
            allowPropagation: true, // Autorisation du partage par défaut
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
        newSujet = created[0] as unknown as ISujet;
      } catch (err: unknown) {
        const error = err as { code?: number };
        if (error.code === 11000) {
          throw new IlotError("Collision critique de slug sur le sujet. Veuillez réitérer.", "CONFLICT", 409);
        }
        throw err;
      }

      // 2. GRAPHE (Neo4j) - Le Tissu Universel (crossLinks)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (s:Sujet { 
           uid: $sujetUid, 
           title: $title, 
           slug: $slug,
           category: $category,
           status: $status,
           createdAt: datetime($now),
           updatedAt: datetime($now)
        })
        CREATE (u)-[:WROTE]->(s)

        WITH s
        UNWIND (CASE WHEN size($crossLinks) > 0 THEN $crossLinks ELSE [null] END) AS link
        FOREACH (_ IN CASE WHEN link IS NOT NULL THEN [1] ELSE [] END |
          MERGE (target:Artifact { uid: link.entityId })
          MERGE (s)-[:RELATES_TO { app: link.entityType, intent: coalesce(link.label, 'reference') }]->(target)
        )

        WITH s
        FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
          MERGE (prod:Product {uid: $productId})
          MERGE (s)-[:OFFERS_PRODUCT]->(prod)
        )

        RETURN s
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
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans le Graphe.", "NOT_FOUND", 404);
      }

      return { success: true, status: 'success', mongo: newSujet, neo4j: neoResult };
    });
  }

  /**
   * MUTATION : METTRE À JOUR UN SUJET
   */
  async updateSujet(sujetIdentifier: string, updates: UpdateSujetPayload, signature: ActionSignature): Promise<SujetSyncResult> {
    const existing = await findEntityBySlugOrUid(SujetModel, sujetIdentifier) as ISujet | null;
    if (!existing) throw new IlotError("Sujet introuvable dans la Silice.", "NOT_FOUND", 404);

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres pensées.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation de Sujet", async (mongoSession, neo4jTx) => {
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
      if (updates.status || updates.category || updates.title || updates.merchLink !== undefined) {
        neoResult = await neo4jTx.run(`
          MATCH (s:Sujet { uid: $sujetUid })
          SET s.title = coalesce($title, s.title),
              s.status = coalesce($status, s.status),
              s.category = coalesce($category, s.category),
              s.updatedAt = datetime($now)
          
          WITH s
          OPTIONAL MATCH (s)-[r:OFFERS_PRODUCT]->(oldProd:Product)
          FOREACH (_ IN CASE WHEN $productId IS NULL AND r IS NOT NULL THEN [1] ELSE [] END | DELETE r)
          
          WITH s
          FOREACH (_ IN CASE WHEN $productId IS NOT NULL THEN [1] ELSE [] END |
            MERGE (newProd:Product {uid: $productId})
            MERGE (s)-[:OFFERS_PRODUCT]->(newProd)
          )

          RETURN s
        `, { 
          sujetUid: existing.uid, 
          title: updates.title || null,
          status: updates.status || null, 
          category: updates.category || null,
          productId: updates.merchLink?.productId || null,
          now: now.toISOString()
        });
      }

      return { success: true, status: 'success', mongo: updatedSujet, neo4j: neoResult };
    });
  }

  /**
   * DÉSINTÉGRATION : PURGER UN SUJET
   */
  async disintegrateSujet(sujetIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const existing = await findEntityBySlugOrUid(SujetModel, sujetIdentifier) as ISujet | null;
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
      
      await Promise.all(deletePromises);
    }

    return result;
  }
}