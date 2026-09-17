import { OiseauModel, FontModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { resolveCanonicalUid } from '../utils/orchestrator.engine'; // 🛡️ Import de l'utilitaire global unifié
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

export interface GlyphData {
  char: string;         // Accepte TOUT : 'A', 'a', '@', 'é', '語', etc. (UTF-8)
  matrix: number[][];   // La matrice 2D du pixel art typée strictement
  unicodeHex?: string;  // Optionnel, pour stocker le code universel (ex: "U+0041")
  [key: string]: unknown;
}

export interface FontSpritePayload {
  uid: string;
  name: string;
  slug: string; 
  authorUid: string;
  gridSize: { width: number; height: number };
  glyphs: GlyphData[]; 
  status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  [key: string]: unknown;
}

export interface FontSpriteResult {
  success: boolean;
  uid: string;
  name: string;
  slug: string;
  glyphsCount: number;
  mongoDocument: unknown;
  [key: string]: unknown;
}

export class LetrinSpriteOrchestrator {
  
  /**
   * 🔠 SÉDIMENTATION D'UNE POLICE DE SPRITES (LETR'IN)
   * Stocke les matrices lourdes dans la Silice (MongoDB) et tisse l'index dans le Graphe (Neo4j).
   */
  public async publishFontSprite(
    fontData: FontSpritePayload,
    signature: ActionSignature
  ): Promise<FontSpriteResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour sédimenter une police de sprites.", "UNAUTHORIZED", 401);
    }

    const fontStatus = fontData.status || 'DRAFT';
    
    // 1. Résolution stricte de l'UID via l'utilitaire global
    const authorCanonicalUid = await resolveCanonicalUid(OiseauModel, fontData.authorUid, "Oiseau auteur");

    return await TransactionManager.execute("Sédimentation Police Sprite Letr'In", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      // ⏱️ SYNCHRONISATION DES HORODATAGES : Constante unique 'now'
      const now = new Date();
      
      // 2. Persistance des matrices et données graphiques dans la Silice (MongoDB)
      const savedFontInMongo = await FontModel.findOneAndUpdate(
        { uid: fontData.uid },
        { 
          $set: {
            name: fontData.name,
            slug: fontData.slug,
            authorUid: authorCanonicalUid,
            gridSize: fontData.gridSize,
            glyphs: fontData.glyphs, // MongoDB sauvegarde nativement l'UTF-8
            status: fontStatus,
            'dates.updatedAt': now
          },
          $setOnInsert: {
            'dates.createdAt': now
          }
        },
        { upsert: true, new: true, session: mongoSession }
      ).lean();

      // 3. Sédimentation du nœud typographique léger dans le Graphe (Neo4j) avec l'horodatage synchronisé
      const cypher = `
        MATCH (u:User { uid: $authorUid })
        MERGE (l:Letter { uid: $uid })
        ON CREATE SET l.createdAt = datetime($now)
        SET l.name = $name, l.slug = $slug, l.status = $status, l.updatedAt = datetime($now)
        MERGE (u)-[:CREATED_FONT]->(l)
        RETURN l.uid AS uid
      `;

      const neoResult = (await neo4jTx.run(cypher, {
        authorUid: authorCanonicalUid,
        uid: fontData.uid,
        name: fontData.name,
        slug: fontData.slug,
        status: fontStatus,
        now: now.toISOString()
      })) as QueryResult;

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec de la sédimentation du nœud typographique dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      return { 
        success: true, 
        uid: fontData.uid, 
        name: fontData.name, 
        slug: fontData.slug,
        glyphsCount: fontData.glyphs.length,
        mongoDocument: savedFontInMongo
      };
    });
  }
}