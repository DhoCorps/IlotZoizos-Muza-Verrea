// packages/shared-core/src/sync-engine/letrinSprite.orchestrator.ts
import { OiseauModel } from '../../../infrastructure/src/database/models/nosql/user.model';
import { FontModel } from '../../../infrastructure/src/database/models/nosql/font.model';
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export interface GlyphData {
  char: string;       // Accepte TOUT : 'A', 'a', '@', 'é', '語', etc. (UTF-8)
  matrix: any[];      // La matrice 2D du pixel art
  unicodeHex?: string;// Optionnel, pour stocker le code universel (ex: "U+0041")
}

export class LetrinSpriteOrchestrator {
  
  /**
   * Utilitaire interne pour résoudre strictement l'UID canonique via la Silice (MongoDB)
   * Permet d'éradiquer les "FULL GRAPH SCANS" dans Neo4j.
   */
  private async resolveCanonicalUid(identifier: string): Promise<string> {
    const user = await OiseauModel.findOne({ 
      $or: [{ slug: identifier }, { uid: identifier }, { pseudo: identifier }] 
    }).lean();
    
    if (!user) {
      throw new IlotError(`Oiseau introuvable dans la Silice : ${identifier}`, "NOT_FOUND", 404);
    }
    return (user as any).uid;
  }

  /**
   * 🔠 SÉDIMENTATION D'UNE POLICE DE SPRITES (LETR'IN)
   * Stocke les matrices lourdes dans la Silice (MongoDB) et tisse l'index dans le Graphe (Neo4j).
   */
  async publishFontSprite(
    fontData: {
      uid: string;
      name: string;
      slug: string; 
      authorUid: string;
      gridSize: { width: number; height: number };
      glyphs: GlyphData[]; // Typage strict pour rassurer sur les majuscules/minuscules/spéciaux
      status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
    },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour sédimenter une police de sprites.", "UNAUTHORIZED", 401);
    }

    const fontStatus = fontData.status || 'DRAFT';
    
    // 1. Résolution stricte de l'UID
    const authorCanonicalUid = await this.resolveCanonicalUid(fontData.authorUid);

    return await TransactionManager.execute("Sédimentation Police Sprite Letr'In", async (mongoSession, neo4jTx) => {
      
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
            'dates.updatedAt': new Date()
          },
          $setOnInsert: {
            'dates.createdAt': new Date()
          }
        },
        { upsert: true, new: true, session: mongoSession }
      ).lean();

      // 3. Sédimentation du nœud typographique léger dans le Graphe (Neo4j)
      // On utilise un MATCH strict sur u:User pour lier la police à son créateur
      const cypher = `
        MATCH (u:User { uid: $authorUid })
        MERGE (l:Letter { uid: $uid })
        ON CREATE SET l.createdAt = datetime()
        SET l.name = $name, l.slug = $slug, l.status = $status, l.updatedAt = datetime()
        MERGE (u)-[:CREATED_FONT]->(l)
        RETURN l.uid AS uid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        authorUid: authorCanonicalUid,
        uid: fontData.uid,
        name: fontData.name,
        slug: fontData.slug,
        status: fontStatus
      });

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