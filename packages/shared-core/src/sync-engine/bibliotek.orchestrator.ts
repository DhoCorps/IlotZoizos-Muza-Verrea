import { LibraryBookModel, ILibraryBook } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';
import { generateSlug } from '../utils/string.engine';
import { generateFileHash } from '../utils/crypto.engine';
import { findEntityBySlugOrUid } from '@ilot/infrastructure';

export interface BibliotekSyncResult {
  success: boolean;
  status: string;
  mongo: ILibraryBook;
  neo4j: any;
}

/**
 * BIBLIOTEK ORCHESTRATOR
 * Gère la sédimentation des ouvrages littéraires, l'application du Sceau SHA-256 d'antériorité
 * et leur tissage dans le Graphe Neo4j (via la recherche unifiée).
 */
export class BibliotekOrchestrator {
  /**
   * FONDATION : FORGER UN OUVRAGE (Livre / Manuscrit / Essai)
   */
  async fosterBook(data: any, signature: ActionSignature): Promise<BibliotekSyncResult> {
    const isSelf = signature.actorUid === data.authorUid;
    if (!isSelf && !signature.capabilities.includes('*')) {
      throw new IlotError("Aura insuffisante pour publier un ouvrage à la place d'un autre.", "FORBIDDEN", 403);
    }

    if (!data.title || !data.fileUrl) {
      throw new IlotError("Un ouvrage nécessite au moins un titre et une source sur le Nexus.", "BAD_REQUEST", 400);
    }

    return await TransactionManager.execute("Fondation d'Ouvrage Bibliotek", async (mongoSession, neo4jTx) => {
      const bookUid = data.uid || `book_${randomUUID()}`;
      const title = data.title;

      // Sécurisation de l'unicité du slug dans la Silice via l'utilitaire partagé
      let baseSlug = data.slug ? generateSlug(data.slug) : generateSlug(title);
      let finalSlug = baseSlug;
      let slugExists = await LibraryBookModel.findOne({ slug: finalSlug }).session(mongoSession);
      let counter = 1;
      while (slugExists) {
        finalSlug = `${baseSlug}-${counter}`;
        slugExists = await LibraryBookModel.findOne({ slug: finalSlug }).session(mongoSession);
        counter++;
      }

      // 🪡 Génération du Sceau Cryptographique (SHA-256) d'antériorité via l'utilitaire partagé
      const canonicalContent = JSON.stringify({
        title: title,
        authorUid: signature.actorUid,
        fileUrl: data.fileUrl,
        writingType: data.writingType || 'roman',
        style: data.style || 'philosophie'
      });
      const digitalSignature = generateFileHash(canonicalContent);
      const timestampedAt = new Date();

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
        timestampedAt,
        copyrightClaimed: true,
        settings: data.settings || { allowReadExchange: true, consentForShowcase: true }
      };

      // 1. Sédimentation dans la Silice (MongoDB)
      const [newBook] = await LibraryBookModel.create([newBookData], { session: mongoSession });

      // 2. Tissage dans le Graphe (Neo4j) avec MATCH strict sur l'auteur canonique
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
           createdAt: datetime()
        })
        CREATE (u)-[:WROTE]->(b)
        RETURN b
      `;

      const neoResult = await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        bookUid: newBook.uid,
        title: newBook.title,
        slug: newBook.slug,
        writingType: newBook.writingType,
        style: newBook.style,
        format: newBook.format,
        digitalSignature: newBook.digitalSignature
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec du tissage : Auteur introuvable dans le Graphe Neo4j.", "NOT_FOUND", 404);
      }

      return {
        success: true,
        status: 'success',
        mongo: newBook,
        neo4j: neoResult
      };
    });
  }

  /**
   * MUTATION : METTRE À JOUR UN OUVRAGE
   */
  async updateBook(bookIdentifier: string, updates: any, signature: ActionSignature): Promise<BibliotekSyncResult> {
    // Utilisation de la recherche unifiée par Slug ou UID
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier);
    if (!existing) {
      throw new IlotError("Ouvrage introuvable dans la Silice.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Tu ne peux modifier que tes propres ouvrages.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Mutation d'Ouvrage Bibliotek", async (mongoSession, neo4jTx) => {
      const updatedBook = await LibraryBookModel.findOneAndUpdate(
        { uid: existing.uid },
        { $set: updates },
        { new: true, session: mongoSession }
      ).lean() as unknown as ILibraryBook;

      let neoResult = null;
      if (updates.title || updates.writingType || updates.style || updates.format) {
        neoResult = await neo4jTx.run(`
          MATCH (b:LibraryBook { uid: $bookUid })
          SET b.title = coalesce($title, b.title),
              b.writingType = coalesce($writingType, b.writingType),
              b.style = coalesce($style, b.style),
              b.format = coalesce($format, b.format),
              b.updatedAt = datetime()
          RETURN b
        `, {
          bookUid: existing.uid,
          title: updates.title || null,
          writingType: updates.writingType || null,
          style: updates.style || null,
          format: updates.format || null
        });
      }

      return {
        success: true,
        status: 'success',
        mongo: updatedBook,
        neo4j: neoResult
      };
    });
  }

  /**
   * DÉSINTRÉGRATION : PURGER UN OUVRAGE DU SANCTUAIRE
   */
  async disintegrateBook(bookIdentifier: string, signature: ActionSignature) {
    // Utilisation de la recherche unifiée par Slug ou UID
    const existing = await findEntityBySlugOrUid(LibraryBookModel, bookIdentifier);
    if (!existing) {
      throw new IlotError("Ouvrage introuvable.", "NOT_FOUND", 404);
    }

    const isAuthor = existing.authorUid === signature.actorUid;
    if (!isAuthor && !signature.capabilities.includes('*')) {
      throw new IlotError("Seul l'auteur ou le système peut brûler cet ouvrage.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Désintégration d'Ouvrage", async (mongoSession, neo4jTx) => {
      const filesToDelete: string[] = [];
      if (existing.fileUrl) filesToDelete.push(existing.fileUrl);
      if (existing.coverUrl) filesToDelete.push(existing.coverUrl);

      // Détachement relationnel et suppression dans le Graphe
      await neo4jTx.run(`MATCH (b:LibraryBook { uid: $bookUid }) DETACH DELETE b`, { bookUid: existing.uid });
      // Suppression dans la Silice
      await LibraryBookModel.deleteOne({ uid: existing.uid }, { session: mongoSession });

      return { success: true, purgedCount: 1, filesToDelete };
    });
  }
}