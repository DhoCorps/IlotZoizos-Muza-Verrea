// packages/shared-core/src/sync-engine/letrin.sprite.orchestrator.ts
import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { FontModel } from '../../../infrastructure/src/database/models/nosql/font.model';

export class LetrinSpriteOrchestrator {
  
  /**
   * 🎨 SÉDIMENTATION D'UNE POLICE DE SPRITES (LETR'IN)
   * Stocke les matrices lourdes dans la Silice (MongoDB) et tisse l'index dans le Graphe (Neo4j).
   */
  async publishFontSprite(
    fontData: {
      uid: string;
      name: string;
      slug: string; 
      authorUid: string;
      gridSize: { width: number; height: number };
      glyphs: Array<any>;
      status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
    },
    signature: ActionSignature
  ) {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour sédimenter une police de sprites.", "UNAUTHORIZED", 401);
    }

    const fontStatus = fontData.status || 'DRAFT';

    return await TransactionManager.execute("Sédimentation Police Sprite Letr'In", async (mongoSession, neo4jTx) => {
      
      // 1. Persistance des matrices et données textuelles/graphiques dans la Silice (MongoDB)
      const savedFontInMongo = await FontModel.findOneAndUpdate(
        { uid: fontData.uid },
        { 
          $set: {
            name: fontData.name,
            slug: fontData.slug,
            authorUid: fontData.authorUid,
            gridSize: fontData.gridSize,
            glyphs: fontData.glyphs,
            status: fontStatus,
            'dates.updatedAt': new Date()
          },
          $setOnInsert: {
            'dates.createdAt': new Date()
          }
        },
        { upsert: true, new: true, session: mongoSession }
      ).lean();

      // 2. Sédimentation du nœud typographique léger dans le Graphe (Neo4j)
      const cypher = `
        MERGE (l:Letter { uid: $uid })
        ON CREATE SET l.createdAt = datetime(), l.authorUid = $authorUid
        SET l.name = $name, l.slug = $slug, l.status = $status, l.updatedAt = datetime()
        RETURN l.uid AS uid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        uid: fontData.uid,
        name: fontData.name,
        slug: fontData.slug,
        authorUid: fontData.authorUid,
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