import { TransactionManager } from './transactionManager';
import { ActionSignature } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';

export class LetrinSpriteOrchestrator {
  
  /**
   * 🎨 SÉDIMENTATION D'UNE POLICE DE SPRITES (LETR'IN)
   */
  async publishFontSprite(
    fontData: {
      uid: string;
      name: string;
      slug: string; // 🪡
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

    return await TransactionManager.execute("Sédimentation Police Sprite Letr'In", async (mongoSession, neo4jTx) => {
      
      const cypher = `
        MERGE (l:Letter { uid: $uid })
        ON CREATE SET l.createdAt = datetime(), l.authorUid = $authorUid
        SET l.name = $name, l.slug = $slug, l.status = $status
        RETURN l.uid AS uid
      `;

      const neoResult = await neo4jTx.run(cypher, {
        uid: fontData.uid,
        name: fontData.name,
        slug: fontData.slug, // 🪡
        authorUid: fontData.authorUid,
        status: fontData.status || 'DRAFT'
      });

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec de la sédimentation du nœud typographique dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      return { 
        success: true, 
        uid: fontData.uid, 
        name: fontData.name, 
        glyphsCount: fontData.glyphs.length 
      };
    });
  }
}