// packages/shared-core/src/sync-engine/resonance.orchestrator.ts

import { TransactionManager } from './transactionManager';
import { getNeo4jSession } from '@ilot/infrastructure';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

// --- LES SYMBOLES DU MAILLAGE ---
// Définit les types de liens possibles entre les différents organes de l'Îlot
export type ResonanceType = 
  | 'ILLUMINATES'   // Ex: Blog -> Projet (Le texte explique le projet)
  | 'MENTIONS'      // Ex: Blog -> E-commerce (Le texte cite un produit)
  | 'INSPIRED_BY'   // Ex: Jeu -> Task (Le jeu est né de cette tâche)
  | 'ECHOES'        // Ex: User -> N'importe quoi (Un commentaire)
  | 'VIBRATES'      // Ex: User -> N'importe quoi (Un Like / Emoji)
  | 'EMBEDDED_IN';  // Ex: Produit -> Letr'In (Le produit est dans la newsletter)

export type EntityLabel = 'Sujet' | 'Project' | 'Task' | 'Team' | 'Product' | 'Game' | 'Letter';

export class ResonanceOrchestrator {
  
  /**
   * 🕸️ LE TISSERAND TRANSDISCIPLINAIRE
   * Crée un pont direct entre deux modules distincts (ex: Blog -> Shop)
   */
  async weaveCrossDomainLink(
    sourceUid: string,
    sourceLabel: EntityLabel,
    targetUid: string,
    targetLabel: EntityLabel,
    relationType: ResonanceType,
    signature: ActionSignature
  ) {
    // Seul l'Architecte ou un processus système peut forger des ponts structurels
    if (!signature.capabilities.includes('*') && !signature.capabilities.includes(CAPABILITIES.SYSTEM.ALL)) {
      throw new IlotError("Aura insuffisante pour tisser le maillage global.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Tissage Transdisciplinaire", async (mongoSession, neo4jTx) => {
      
      // La magie de Neo4j : on injecte les Labels dynamiquement pour trouver les noeuds peu importe leur domaine
      const cypher = `
        MATCH (source:${sourceLabel} { uid: $sourceUid })
        MATCH (target:${targetLabel} { uid: $targetUid })
        MERGE (source)-[r:${relationType}]->(target)
        ON CREATE SET r.createdAt = datetime(), r.actorUid = $actorUid
        RETURN r
      `;

      const neoResult = await neo4jTx.run(cypher, {
        sourceUid,
        targetUid,
        actorUid: signature.actorUid
      });

      if (neoResult.records.length === 0) {
         throw new IlotError("L'un des deux nœuds est introuvable dans le Graphe.", "NOT_FOUND", 404);
      }
      
      return { success: true, neo4j: neoResult };
    });
  }

  /**
   * 💬 L'ÉCHO SOCIAL (Commentaires & Emojis)
   * Permet à un Oiseau de réagir à n'importe quelle entité de l'Îlot (Blog, Produit, Jeu...)
   */
  async addSocialEcho(
    targetUid: string,
    targetLabel: EntityLabel,
    echoType: 'TEXT' | 'EMOJI',
    content: string, // Le texte du commentaire ou l'emoji (ex: "🔥")
    signature: ActionSignature
  ) {
    if (!signature.actorUid) throw new IlotError("Oiseau fantôme.", "UNAUTHORIZED", 401);

    return await TransactionManager.execute("Sédimentation d'Écho", async (mongoSession, neo4jTx) => {
      
      const echoUid = `echo_${randomUUID()}`;
      const relation = echoType === 'TEXT' ? 'ECHOES' : 'VIBRATES';

      // 1. Écriture dans le Graphe (On crée la relation)
      const cypher = `
        MATCH (u:User { uid: $actorUid })
        MATCH (target:${targetLabel} { uid: $targetUid })
        
        // On crée la relation avec ses métadonnées directement gravées sur le lien
        CREATE (u)-[r:${relation} { 
          uid: $echoUid,
          content: $content,
          createdAt: datetime() 
        }]->(target)
        
        RETURN r
      `;

      await neo4jTx.run(cypher, {
        actorUid: signature.actorUid,
        targetUid,
        echoUid,
        content
      });
      
      return { success: true, echoUid, content, type: echoType };
    });
  }

  /**
   * 🔍 LE RADAR DE RÉSONANCE
   * Va chercher toutes les entités connectées à un noeud spécifique, peu importe leur domaine d'origine.
   */
  async getResonances(uid: string) {
    const session = getNeo4jSession();
    try {
      const cypher = `
        MATCH (center { uid: $uid })-[r]-(neighbor)
        RETURN 
          type(r) AS relationType, 
          labels(neighbor)[0] AS neighborType, 
          neighbor.uid AS neighborUid, 
          neighbor.title AS neighborTitle, 
          neighbor.name AS neighborName
      `;
      
      const result = await session.run(cypher, { uid });
      
      return result.records.map(rec => ({
        relation: rec.get('relationType'),
        type: rec.get('neighborType'),
        uid: rec.get('neighborUid'),
        title: rec.get('neighborTitle') || rec.get('neighborName') || 'Entité inconnue'
      }));
    } finally {
      await session.close();
    }
  }

  /**
 * Recherche les résonances transversales entre un oiseau et le reste de la volière
 * en se basant sur le partage de tags ou de fréquences dans le graphe Neo4j.
 */
public async findTransversalResonances(userUid: string): Promise<{ peerUid: string; sharedTags: string[]; score: number }[]> {
    return await TransactionManager.execute('findTransversalResonances', async (mongoSession, neo4jTx) => {
        // Requête Cypher Neo4j pour trouver les pairs partageant des nœuds sémantiques ou des tags similaires
        const query = `
            MATCH (target:User {uid: $userUid})-[:PARTAGE]->(tag:Tag)<-[:PARTAGE]-(peer:User)
            WHERE target <> peer
            RETURN peer.uid AS peerUid, collect(tag.name) AS sharedTags, count(tag) AS commonCount
            ORDER BY commonCount DESC
            LIMIT 10
        `;

        const result = await neo4jTx.run(query, { userUid });
        
        return result.records.map(record => ({
            peerUid: record.get('peerUid'),
            sharedTags: record.get('sharedTags'),
            score: record.get('commonCount').toNumber() * 2 // Application du coefficient de résonance transversale
        }));
    });
  }

}

