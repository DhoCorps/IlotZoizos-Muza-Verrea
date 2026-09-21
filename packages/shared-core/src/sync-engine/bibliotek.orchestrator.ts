import { LibraryBookModel, ILibraryBook } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, LibraryBookEconomyMetadata } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { generateFileHash } from '../utils/crypto.engine';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; 
import { NotificationOrchestrator } from './notification.orchestrator'; // 🌿 Injection de la Canopée

// Interface d'injection pour le service de stockage
interface IStorageManager {
  deleteFile(key: string): Promise<unknown>;
  extractKeyFromUrl(url: string): string;
}

export interface BibliotekSyncResult {
  success: boolean;
  status: string;
  mongo: ILibraryBook & {
    digitalSignature?: string;
    timestampedAt?: Date;
    economy?: LibraryBookEconomyMetadata;
  };
  neo4j: any;
}

export interface FosterBookPayload {
  uid?: string;
  title: string;
  slug?: string;
  authorUid: string;
  authorSlug?: string;
  writingType?: string;
  style?: string;
  fileUrl: string;
  coverUrl?: string | null;
  format?: string;
  economy?: Partial<LibraryBookEconomyMetadata>; // 💎 Support du Gacha & Barter
  settings?: {
    allowReadExchange?: boolean;
    consentForShowcase?: boolean;
  };
}

/**
 * BIBLIOTEK ORCHESTRATOR
 * Gère la sédimentation des ouvrages littéraires, l'application du Sceau SHA-256 d'antériorité
 * et leur tissage dans le Graphe Neo4j, ainsi que l'alimentation de la Canopée Tampon.
 */
export class BibliotekOrchestrator {
  private storageService: IStorageManager;
  private notificationOrchestrator: NotificationOrchestrator; // 🌿 Le cerveau des notifications

  constructor(customStorageService?: IStorageManager, notificationOrchestrator?: NotificationOrchestrator) {
    this.storageService = customStorageService || {
      deleteFile: async () => ({ success: true }),
      extractKeyFromUrl: (url: string) => url.split('/').pop() || ''
    };
    this.notificationOrchestrator = notificationOrchestrator || new NotificationOrchestrator();
  }

  /**
   * 🧱 FONDATION : FORGER UN OUVRAGE (Livre / Manuscrit / Essai)
   */
  async fosterBook(data: FosterBookPayload, signature: ActionSignature): Promise<BibliotekSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour publier un ouvrage à la place d'un autre.", "FORBIDDEN", 403);
    }

    if (!data.title || !data.fileUrl) {
      throw new IlotError("Un ouvrage nécessite au moins un titre et une source sur le Nexus.", "BAD_REQUEST", 400);
    }

    const txResult = await TransactionManager.execute("Fondation d'Ouvrage Bibliotek", async (mongoSession, neo4jTx) => {
      const bookUid = data.uid || `book_${randomUUID()}`;
      const title = data.title;

      const baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      const finalSlug = await ensureUniqueSlug(LibraryBookModel, baseSlug, mongoSession);

      const canonicalContent = JSON.stringify({
        title: title,
        authorUid: signature.actorUid,
        fileUrl: data.fileUrl,
        writingType: data.writingType || 'roman',
        style: data.style || 'philosophie'
      });
      const digitalSignature = generateFileHash(canonicalContent);
      
      const now = new Date();

      // 💎 Construction des métadonnées économiques par défaut (Barter & Gacha)
      const defaultEconomy: LibraryBookEconomyMetadata = {
        priceCents: data.economy?.priceCents ?? 0,
        currency: data.economy?.currency ?? 'EUR',
        rights: {
          allowCommercial: data.economy?.rights?.allowCommercial ?? true,
          allowBarter: data.economy?.rights?.allowBarter ?? true,
          allowLending: data.economy?.rights?.allowLending ?? true,
          transferable: data.economy?.rights?.transferable ?? true,
        },
        barterAllowed: data.economy?.barterAllowed ?? true,
        gachaTier: data.economy?.gachaTier ?? 'common',
        isTradable: data.economy?.isTradable ?? true,
      };

      const newBookData = {
        uid: bookUid,
        title: title,
        slug: finalSlug,
        authorUid: signature.actorUid,
        authorSlug: data.authorSlug || signature.actorUid,
        writingType: data.writingType || 'roman',
        style: data.style || 'philosophie',
        fileUrl: data.fileUrl,
        coverUrl: data.coverUrl || null,
        format: data.format || 'epub',
        digitalSignature,
        timestampedAt: now,
        copyrightClaimed: true,
        economy: defaultEconomy, // 💎 Synchronisation des propriétés financières et de troc
        settings: {
          allowReadExchange: data.settings?.allowReadExchange ?? true,
          consentForShowcase: data.settings?.consentForShowcase ?? true,
        }
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newBook] = await LibraryBookModel.create([newBookData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) & 🌿 Récupération des abonnés
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (b:LibraryBook {
            uid: $bookUid,
            title: $title,
            slug: $slug,
            writingType: $writingType,
            style: $style,
            format: $format,
            digitalSignature: $digitalSignature,
            priceCents: $priceCents,
            barterAllowed: $barterAllowed,
            gachaTier: $gachaTier,
            createdAt: datetime($now)
        })
        CREATE (u)-[:WROTE]->(b)
        WITH b, u
        OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)
        RETURN b, collect(DISTINCT follower.uid) AS followerUids
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        bookUid: newBook.uid,
        title: newBook.title,
        slug: newBook.slug,
        writingType: newBook.writingType,
        style: newBook.style,
        format: newBook.format,
        digitalSignature: newBook.digitalSignature,
        priceCents: defaultEconomy.priceCents,
        barterAllowed: defaultEconomy.barterAllowed,
        gachaTier: defaultEconomy.gachaTier,
        now: now.toISOString()
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans le Graphe Neo4j.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newBook.toObject() as unknown as BibliotekSyncResult['mongo'],
        neo4j: neoResult
      };
    });

    // 🌿 3. LA CANOPÉE TAMPON (Post-Transaction, non-bloquant)
    if (txResult.success && txResult.neo4j) {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          Promise.allSettled(followerUids.map((uid: string) => 
            this.notificationOrchestrator.fosterNotification({
              recipientUid: uid,
              senderUid: signature.actorUid,
              category: 'TEXT',
              type: 'NEW_BOOK',
              payload: {
                title: "Nouvel Ouvrage dans le Sanctuaire",
                message: `L'Oiseau a scellé un nouveau manuscrit : ${txResult.mongo?.title}`,
                targetUrl: `/bibliotek/${txResult.mongo?.slug}`,
                targetUid: txResult.mongo?.uid,
                targetType: 'BOOK'
              }
            }, signature)
          )).catch(e => console.error("[Canopée Bibliotek] Erreur lors de la distribution des échos:", e));
        }
      }
    }

    return txResult;
  }

  /**
   * 🧬 MUTATION : METTRE À JOUR UN OUVRAGE
   */
  async updateBook(bookIdentifier: string, updates: Record<string, unknown>, signature: ActionSignature): Promise<BibliotekSyncResult> {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as ILibraryBook | null;
    if (!existing) {
      throw new IlotError("Ouvrage introuvable dans la Silice.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres ouvrages.", "FORBIDDEN", 403);
    }

    const txResult = await TransactionManager.execute("Mutation d'Ouvrage Bibliotek", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      const updatedBook = await LibraryBookModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: { ...updates, "dates.updatedAt": now } },
        { new: true, session: mongoSession }
      ).lean() as unknown as ILibraryBook;

      let neoResult = null;
      if (updates.title || updates.writingType || updates.style || updates.format || updates.economy) {
        // 🌿 Mise à jour du nœud et récupération des abonnés
        neoResult = await neo4jTx.run(`
          MATCH (b:LibraryBook { uid: $bookUid })
          SET b.title = coalesce($title, b.title),
              b.writingType = coalesce($writingType, b.writingType),
              b.style = coalesce($style, b.style),
              b.format = coalesce($format, b.format),
              b.updatedAt = datetime($now)
          WITH b
          MATCH (author:User { uid: $authorUid })
          OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(author)
          RETURN b, collect(DISTINCT follower.uid) AS followerUids
        `, {
          bookUid: existing.uid,
          authorUid: existing.authorUid, // Requis pour cibler les followers
          title: updates.title || null,
          writingType: updates.writingType || null,
          style: updates.style || null,
          format: updates.format || null,
          now: now.toISOString()
        });
      }

      return {
        success: true,
        status: 'success',
        mongo: updatedBook as unknown as BibliotekSyncResult['mongo'],
        neo4j: neoResult
      };
    });

    // 🌿 3. LA CANOPÉE TAMPON (Avertir d'une mise à jour majeure)
    if (txResult.success && txResult.neo4j) {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          Promise.allSettled(followerUids.map((uid: string) => 
            this.notificationOrchestrator.fosterNotification({
              recipientUid: uid,
              senderUid: signature.actorUid,
              category: 'SYSTEM',
              type: 'UPDATED_BOOK',
              payload: {
                title: "Manuscrit retouché",
                message: `L'Oiseau a apporté des modifications à l'ouvrage : ${txResult.mongo?.title}`,
                targetUrl: `/bibliotek/${txResult.mongo?.slug}`,
                targetUid: txResult.mongo?.uid,
                targetType: 'BOOK'
              }
            }, signature)
          )).catch(e => console.error("[Canopée Bibliotek] Erreur d'écho sur update:", e));
        }
      }
    }

    return txResult;
  }

  /**
   * 🌋 DÉSINTRÉGRATION : PURGER UN OUVRAGE DU SANCTUAIRE
   */
  async disintegrateBook(bookIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as ILibraryBook | null;
    if (!existing) {
      throw new IlotError("Ouvrage introuvable.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cet ouvrage.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration d'Ouvrage", async (mongoSession, neo4jTx) => {
      const filesToDelete: string[] = [];
      if (existing.fileUrl) filesToDelete.push(this.storageService.extractKeyFromUrl(existing.fileUrl));
      if (existing.coverUrl) filesToDelete.push(this.storageService.extractKeyFromUrl(existing.coverUrl));

      await Promise.all(
        filesToDelete.map(async (key) => {
          try {
            await this.storageService.deleteFile(key);
          } catch (err) {
            console.error(`  [Orchestrator] Échec purge fichier ${key} :`, err);
          }
        })
      );

      await neo4jTx.run(`MATCH (b:LibraryBook { uid: $bookUid }) DETACH DELETE b`, { bookUid: existing.uid });
      await LibraryBookModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1 };
    });
  }
}