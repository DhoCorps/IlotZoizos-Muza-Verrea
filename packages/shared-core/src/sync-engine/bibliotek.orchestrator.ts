// Fichier : packages/backend/src/orchestrators/bibliotek.orchestrator.ts
import { LibraryBookModel, ILibraryBook } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, LibraryBookEconomyMetadata, CopyrightMetadata } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ensureUniqueSlug } from '../utils/orchestrator.engine'; 
import { NotificationOrchestrator } from './notification.orchestrator';
import { sanitizeCopyright, getCopyrightCypherRelation, generateFileHash } from '../utils/copyright.engine'; // 🚀 Import du Helper DRY

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
    copyrightMetadata?: CopyrightMetadata;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  fileUrl: string;
  coverUrl?: string | null;
  format?: string;
  tags?: string[]; // 🚀 Ajout du squelette des tags
  economy?: Partial<LibraryBookEconomyMetadata>;
  copyrightMetadata?: CopyrightMetadata;
  settings?: {
    allowReadExchange?: boolean;
    consentForShowcase?: boolean;
  };
}

export interface EmotionalHighlightPayload {
  selectedText: string;
  emotion: string; // Ex: '<(:<'
  comment?: string;
}

export interface EmotionalHighlightResult {
  success: boolean;
  highlight: {
    uid: string;
    readerUid: string;
    selectedText: string;
    emotion: string;
    comment?: string;
    isScholarSealed: boolean;
    createdAt: Date;
  };
  book: ILibraryBook;
}

/**
 * BIBLIOTEK ORCHESTRATOR
 * Gère la sédimentation des ouvrages, le Sceau SHA-256 d'antériorité, 
 * le cycle de vie, les Surlignages Émotionnels, et les filiations artistiques (Copyright).
 */
export class BibliotekOrchestrator {
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
   * 🧱 FONDATION : FORGER UN OUVRAGE
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
      const publicationStatus = data.status || 'DRAFT';

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

      // 🛡️ Logique métier du Copyright centralisée (Pacte de Filiation inclus)
      const cpMeta = sanitizeCopyright(data.copyrightMetadata);

      // ✨ OPTIMISATION SEO : Auto-génération de balises pour les moteurs de recherche
      const autoSeo = {
        metaTitle: `${title} | Bibliotek`,
        metaDescription: `Découvrez cet ouvrage de type ${data.writingType || 'roman'} (${data.style || 'philosophie'}) par ${data.authorSlug || signature.actorUid}.`,
        ogType: 'book',
        articleAuthor: data.authorSlug || signature.actorUid
      };

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
        status: publicationStatus,
        fileUrl: data.fileUrl,
        coverUrl: data.coverUrl || null,
        format: data.format || 'epub',
        tags: data.tags || [],
        digitalSignature,
        timestampedAt: now,
        copyrightClaimed: true,
        copyrightMetadata: cpMeta, 
        economy: defaultEconomy,
        seo: autoSeo,
        emotionalHighlights: [],
        settings: {
          allowReadExchange: data.settings?.allowReadExchange ?? true,
          consentForShowcase: data.settings?.consentForShowcase ?? true,
        }
      };

      const [newBook] = await LibraryBookModel.create([newBookData], { session: mongoSession });

      // 🌐 Génération dynamique du lien Graphe selon le rôle de l'artiste
      const relationType = getCopyrightCypherRelation(cpMeta.role);

      // 🚀 Injection des métadonnées de Filiation dans le Graphe Neo4j
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        CREATE (b:LibraryBook {
            uid: $bookUid,
            title: $title,
            slug: $slug,
            writingType: $writingType,
            style: $style,
            status: $status,
            format: $format,
            digitalSignature: $digitalSignature,
            priceCents: $priceCents,
            barterAllowed: $barterAllowed,
            gachaTier: $gachaTier,
            isExclusiveIlot: $isExclusiveIlot,
            hasFiliation: $hasFiliation,
            filiationClaimStatus: $filiationClaimStatus,
            createdAt: datetime($now)
        })
        CREATE (u)-[:${relationType} { notes: $sublimationNotes }]->(b)
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
        status: newBook.status,
        format: newBook.format,
        digitalSignature: newBook.digitalSignature,
        priceCents: defaultEconomy.priceCents,
        barterAllowed: defaultEconomy.barterAllowed,
        gachaTier: defaultEconomy.gachaTier,
        isExclusiveIlot: cpMeta.isExclusiveIlot,
        hasFiliation: !!cpMeta.filiation, // 🪡 Trace dans le Graphe si c'est une œuvre dérivée
        filiationClaimStatus: cpMeta.filiation?.claimStatus || 'NONE', // 🪡 État du Pacte
        sublimationNotes: cpMeta.sublimationNotes || '',
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

    if (txResult.success && txResult.neo4j && data.status === 'PUBLISHED') {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          const exclusiveBadge = data.copyrightMetadata?.isExclusiveIlot ? ' ✨ [Exclusivité Îlot]' : '';
          
          Promise.allSettled(followerUids.map((uid: string) => 
            this.notificationOrchestrator.fosterNotification({
              recipientUid: uid,
              senderUid: signature.actorUid,
              category: 'TEXT',
              type: 'NEW_BOOK',
              payload: {
                title: `Nouvel Ouvrage dans le Sanctuaire${exclusiveBadge}`,
                message: `L'Oiseau a publié un manuscrit scellé : ${txResult.mongo?.title}`,
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
   * 🧬 MUTATION : METTRE À JOUR UN OUVRAGE (et gérer la publication de brouillons)
   */
  async updateBook(bookIdentifier: string, updates: Record<string, unknown>, signature: ActionSignature): Promise<BibliotekSyncResult> {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as unknown as ILibraryBook | null;
    if (!existing) {
      throw new IlotError("Ouvrage introuvable dans la Silice.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres ouvrages.", "FORBIDDEN", 403);
    }

    const wasDraft = existing.status === 'DRAFT';
    const isNowPublished = updates.status === 'PUBLISHED';

    const txResult = await TransactionManager.execute("Mutation d'Ouvrage Bibliotek", async (mongoSession, neo4jTx) => {
      const now = new Date();
      
      const updatedBook = await LibraryBookModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: { ...updates, "updatedAt": now } },
        { new: true, session: mongoSession }
      ).lean() as unknown as ILibraryBook;

      let neoResult = null;
      if (updates.title || updates.status || updates.economy || updates.copyrightMetadata) {
        
        const cpUpdate = updates.copyrightMetadata ? sanitizeCopyright(updates.copyrightMetadata as any) : null;
        const isExclusiveUpdate = cpUpdate ? cpUpdate.isExclusiveIlot : null;
        const filiationClaimStatusUpdate = cpUpdate?.filiation ? cpUpdate.filiation.claimStatus : null;

        neoResult = await neo4jTx.run(`
          MATCH (b:LibraryBook { uid: $bookUid })
          SET b.title = coalesce($title, b.title),
              b.status = coalesce($status, b.status),
              b.isExclusiveIlot = coalesce($isExclusiveIlot, b.isExclusiveIlot),
              b.filiationClaimStatus = coalesce($filiationClaimStatus, b.filiationClaimStatus),
              b.updatedAt = datetime($now)
          WITH b
          MATCH (author:User { uid: $authorUid })
          OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(author)
          RETURN b, collect(DISTINCT follower.uid) AS followerUids
        `, {
          bookUid: existing.uid,
          authorUid: existing.authorUid,
          title: updates.title || null,
          status: updates.status || null,
          isExclusiveIlot: isExclusiveUpdate,
          filiationClaimStatus: filiationClaimStatusUpdate,
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

    if (txResult.success && txResult.neo4j) {
      const records = txResult.neo4j.records;
      if (records.length > 0) {
        const followerUids = records[0].get('followerUids') || [];
        
        if (followerUids.length > 0) {
          if (wasDraft && isNowPublished) {
            Promise.allSettled(followerUids.map((uid: string) => 
              this.notificationOrchestrator.fosterNotification({
                recipientUid: uid,
                senderUid: signature.actorUid,
                category: 'TEXT',
                type: 'NEW_BOOK',
                payload: {
                  title: "Nouveau Manuscrit Libéré",
                  message: `L'Oiseau a achevé et publié son manuscrit : ${txResult.mongo?.title}`,
                  targetUrl: `/bibliotek/${txResult.mongo?.slug}`,
                  targetUid: txResult.mongo?.uid,
                  targetType: 'BOOK'
                }
              }, signature)
            )).catch(e => console.error("[Canopée Bibliotek] Erreur publication brouillon:", e));
          }
        }
      }
    }

    return txResult;
  }

  /**
   * ✨ SURLIGNAGE ÉMOTIONNEL : Ajouter une fulgurance ciblée
   */
  async addEmotionalHighlight(bookIdentifier: string, payload: EmotionalHighlightPayload, signature: ActionSignature): Promise<EmotionalHighlightResult> {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as unknown as ILibraryBook | null;
    if (!existing) {
      throw new IlotError("Ouvrage introuvable dans la Silice.", "NOT_FOUND", 404);
    }

    const highlightUid = `emo_${randomUUID()}`;
    const newHighlight = {
      uid: highlightUid,
      readerUid: signature.actorUid,
      selectedText: payload.selectedText,
      emotion: payload.emotion,
      comment: payload.comment,
      isScholarSealed: false,
      createdAt: new Date()
    };

    const updatedBook = await LibraryBookModel.findOneAndUpdate(
      { uid: existing.uid },
      { $push: { emotionalHighlights: newHighlight } },
      { new: true }
    ).lean() as unknown as ILibraryBook;

    if (existing.authorUid !== signature.actorUid) {
      try {
        await this.notificationOrchestrator.fosterNotification({
          recipientUid: existing.authorUid,
          senderUid: signature.actorUid,
          category: 'RESONANCE',
          type: 'EMOTIONAL_HIGHLIGHT',
          payload: {
            title: "Vibration Littéraire",
            message: `Un Oiseau a vibré sur ce passage : "${payload.selectedText.substring(0, 30)}..."`,
            targetUrl: `/bibliotek/${existing.slug}/studio`,
            targetUid: existing.uid,
            targetType: 'HIGHLIGHT'
          }
        }, { actorUid: 'system', capabilities: [] });
      } catch (e) {
        console.error("[Canopée Bibliotek] Erreur notification highlight:", e);
      }
    }

    return { success: true, highlight: newHighlight, book: updatedBook };
  }

  /**
   * 📜 SCEAU DE L'ÉRUDIT : Promouvoir/Rétrograder une note d'un lecteur
   */
  async toggleScholarSeal(bookIdentifier: string, highlightUid: string, isSealed: boolean, signature: ActionSignature) {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as unknown as ILibraryBook | null;
    if (!existing) {
      throw new IlotError("Ouvrage introuvable.", "NOT_FOUND", 404);
    }

    if (existing.authorUid !== signature.actorUid && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur de l'ouvrage peut décerner le Sceau de l'Érudit.", "FORBIDDEN", 403);
    }

    const updatedBook = await LibraryBookModel.findOneAndUpdate(
      { uid: existing.uid, "emotionalHighlights.uid": highlightUid },
      { $set: { "emotionalHighlights.$.isScholarSealed": isSealed } },
      { new: true }
    ).lean() as unknown as ILibraryBook;

    if (!updatedBook) {
      throw new IlotError("Fulgurance introuvable dans cet ouvrage.", "NOT_FOUND", 404);
    }

    // ✨ NOUVEAU: Notification gratifiante au lecteur ! Utilisation d'un bloc try/catch robuste
    if (isSealed) {
      const highlight = updatedBook.emotionalHighlights.find((h: any) => h.uid === highlightUid);
      if (highlight && highlight.readerUid !== existing.authorUid) {
        try {
          await this.notificationOrchestrator.fosterNotification({
            recipientUid: highlight.readerUid,
            senderUid: signature.actorUid,
            category: 'RESONANCE',
            type: 'SCHOLAR_SEAL_AWARDED',
            payload: {
              title: "Sceau de l'Érudit Obtenu !",
              message: `L'auteur a érigé votre fulgurance au rang de Note d'Érudit.`,
              targetUrl: `/bibliotek/${existing.slug}`,
              targetUid: existing.uid,
              targetType: 'HIGHLIGHT'
            }
          }, { actorUid: 'system', capabilities: [] });
        } catch (e) {
          console.error("[Canopée Bibliotek] Échec de l'envoi de la notification Érudit:", e);
        }
      }
    }

    return { success: true, isScholarSealed: isSealed };
  }

  /**
   * 🌋 DÉSINTRÉGRATION : PURGER UN OUVRAGE DU SANCTUAIRE
   */
  async disintegrateBook(bookIdentifier: string, signature: ActionSignature): Promise<{ success: boolean; purgedCount: number }> {
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier) as unknown as ILibraryBook | null;
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