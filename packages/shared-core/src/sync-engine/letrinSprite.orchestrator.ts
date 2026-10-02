// Fichier : packages/backend/src/orchestrators/letrinSprite.orchestrator.ts
import { OiseauModel, LetrinFontSpriteModel } from '@ilot/infrastructure';
import { TransactionManager } from './transactionManager';
import { ActionSignature, TypographicCategoryEnum } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { resolveCanonicalUid } from '../utils/orchestrator.engine';
import * as crypto from 'crypto';
import type { ClientSession } from 'mongoose';
import type { Transaction, QueryResult } from 'neo4j-driver';

// ==========================================
// INTERFACES PAYLOADS & RÉSULTATS
// ==========================================
export interface GlyphData {
  character: string;
  unicodeCodePoint?: string;
  frames: Array<{ frameIndex: number; width: number; height: number; pixels: string[] }>;
  advanceWidth: number;
  barter?: { isBarterable: boolean; barterValueKarma: number; desiredExchangeGlyph?: string; };
  [key: string]: unknown;
}

export interface FontSpritePayload {
  uid: string;
  name: string;
  slug: string; 
  authorUid: string;
  gridSize: { width: number; height: number };
  category?: TypographicCategoryEnum | string;
  tags?: string[];
  frequencyHz?: number;
  isFrequencyMuted?: boolean;
  seo?: any;
  copyrightMetadata?: any;
  gamification?: any;
  glyphs: GlyphData[]; 
  status?: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
}

export interface FontSpriteResult {
  success: boolean;
  uid: string;
  name: string;
  slug: string;
  cryptoSeal: {
    digitalSignature: string;
    timestampedAt: Date;
    sealedByUid: string;
    copyrightMetadata?: any;
  };
  glyphsCount: number;
  mongoDocument: unknown;
}

export class LetrinSpriteOrchestrator {
  
  /**
   * 🔠 PUBLICATION ALCHIMIQUE D'UNE POLICE OU D'UN SPRITE
   * Valide les glyphes, scelle l'empreinte SHA-256, écrit dans MongoDB, et crée le nœud Neo4j.
   */
  public async publishFontSprite(
    fontData: FontSpritePayload,
    signature: ActionSignature
  ): Promise<FontSpriteResult> {
    if (!signature.actorUid) {
      throw new IlotError("Oiseau non authentifié pour sédimenter une œuvre Letr'In.", "UNAUTHORIZED", 401);
    }

    const fontStatus = fontData.status || 'DRAFT';
    const authorCanonicalUid = await resolveCanonicalUid(OiseauModel, fontData.authorUid, "Oiseau auteur");

    // 🔒 Génération du Sceau Cryptographique d'Antériorité (SHA-256)
    const canonicalContent = JSON.stringify({
      name: fontData.name,
      authorUid: authorCanonicalUid,
      gridSize: fontData.gridSize,
      glyphs: fontData.glyphs,
    });
    const digitalSignature = crypto.createHash('sha256').update(canonicalContent).digest('hex');
    const now = new Date();

    // Construction du sceau cryptographique unifié
    const cryptoSeal = {
      digitalSignature,
      timestampedAt: now,
      sealedByUid: signature.actorUid,
      copyrightMetadata: fontData.copyrightMetadata
    };

    return await TransactionManager.execute("Sédimentation Letr'In", async (mongoSession: ClientSession, neo4jTx: Transaction) => {
      
      // 1. Persistance massive dans la Silice (MongoDB)
      const savedFontInMongo = await LetrinFontSpriteModel.findOneAndUpdate(
        { uid: fontData.uid },
        { 
          $set: {
            name: fontData.name,
            slug: fontData.slug,
            authorUid: authorCanonicalUid,
            gridSize: fontData.gridSize,
            category: fontData.category || 'LINEALE',
            tags: fontData.tags || [],
            seo: fontData.seo,
            frequencyHz: fontData.frequencyHz ?? 432,
            isFrequencyMuted: fontData.isFrequencyMuted ?? false,
            glyphs: fontData.glyphs,
            gamification: fontData.gamification,
            status: fontStatus,
            // 🚀 Injection du Sceau Cryptographique Unifié
            cryptoSeal: cryptoSeal,
            'dates.updatedAt': now
          },
          $setOnInsert: {
            'dates.createdAt': now
          }
        },
        { upsert: true, new: true, session: mongoSession }
      ).lean();

      // 2. Sédimentation du nœud relationnel dans Neo4j (Constellation)
      const cypher = `
        MATCH (u:User { uid: $authorUid })
        MERGE (f:Font { uid: $uid })
        ON CREATE SET f.createdAt = datetime($now)
        SET f.name = $name, 
            f.slug = $slug, 
            f.status = $status, 
            f.category = $category,
            f.digitalSignature = $digitalSignature,
            f.updatedAt = datetime($now)
        MERGE (u)-[:CREATED_FONT]->(f)
        RETURN f.uid AS uid
      `;

      const neoResult = (await neo4jTx.run(cypher, {
        authorUid: authorCanonicalUid,
        uid: fontData.uid,
        name: fontData.name,
        slug: fontData.slug,
        status: fontStatus,
        category: fontData.category || 'LINEALE',
        digitalSignature: digitalSignature, // Toujours à plat pour Neo4j
        now: now.toISOString()
      })) as QueryResult;

      if (neoResult.records.length === 0) {
        throw new IlotError("Échec de la sédimentation du nœud Letr'In dans le Graphe.", "INTERNAL_ERROR", 500);
      }

      return { 
        success: true, 
        uid: fontData.uid, 
        name: fontData.name, 
        slug: fontData.slug,
        cryptoSeal: cryptoSeal, // 🚀 Retourne le sceau structuré
        glyphsCount: fontData.glyphs.length,
        mongoDocument: savedFontInMongo
      };
    });
  }

  /**
   * 🌌 RÉCUPÉRATION DE LA CONSTELLATION GRAPHALE (Neo4j -> React)
   * Extrait le graphe des usages d'une police : (Font)-[:USED_IN]->(Content)
   * Formate les données pour le composant <Constellation3D />
   */
  public async getFontConstellationGraph(fontUid: string) {
    return await TransactionManager.execute("Extraction Constellation Letr'In", async (_mongoSession: ClientSession, neo4jTx: Transaction) => {
      const cypher = `
        MATCH (f:Font { uid: $fontUid })
        OPTIONAL MATCH (f)-[r:USED_IN]->(c)
        RETURN f, collect({ rel: type(r), target: c }) as connections
      `;

      const result = await neo4jTx.run(cypher, { fontUid });
      
      if (result.records.length === 0) {
        throw new IlotError("Police introuvable dans la constellation.", "NOT_FOUND", 404);
      }

      const fontNode = result.records[0].get('f').properties;
      const connections = result.records[0].get('connections');

      const nodes = [{ id: fontNode.uid, name: fontNode.name, type: 'FONT' }];
      const links: Array<{ source: string; target: string; type: string }> = [];

      connections.forEach((conn: any) => {
        if (conn.target) {
          const targetProps = conn.target.properties;
          const targetType = conn.target.labels.includes('Blog') ? 'BLOG' : conn.target.labels.includes('Book') ? 'PROJECT' : 'PROJECT';
          
          nodes.push({ id: targetProps.uid, name: targetProps.title || targetProps.name || 'Inconnu', type: targetType });
          links.push({ source: fontNode.uid, target: targetProps.uid, type: conn.rel });
        }
      });

      return { nodes, links };
    });
  }
}