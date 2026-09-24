// Fichier : lib/cache/context.cache.ts
import { unstable_cache } from 'next/cache';
import { getNeo4jSession } from '@ilot/infrastructure';
import type { Node, Relationship } from 'neo4j-driver';

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  frequency: string | null;
  status: string | null;
  energyWeight: number | null;
  instrument: string | null;
  resolution: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// -------------------------------------------------------------------------
// CACHE SÉCURISÉ : Résultats du graphe contextuel (60s) avec bypass en mode test
// -------------------------------------------------------------------------
export async function getCachedGraphData(rootUid: string): Promise<GraphData> {
  const fetcher = async (): Promise<GraphData> => {
    const session = getNeo4jSession();
    try {
      const result = await session.run(`
        MATCH (root {uid: $rootUid})
        OPTIONAL MATCH (root)-[r]-(neighbor)
        RETURN root, r, neighbor
      `, { rootUid });
      
      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const nodeIds = new Set<string>();
      
      const formatNodeData = (recordNode: Node<number>): GraphNode => {
        const props = recordNode.properties as Record<string, unknown>;
        const label = recordNode.labels[0] || 'Entity';
        const nameProp = (props.name || props.title || props.pseudo || (typeof props.content === 'string' ? props.content.substring(0, 20) : 'Entité Sans Nom')) as string;
        
        return {
          id: (props.uid as string) || '',
          name: nameProp,
          type: label,
          frequency: (props.frequenceHEX as string) || (props.color as string) || null,
          status: (props.status as string) || (props.visibility as string) || null,
          energyWeight: (props.energyWeight as number) || null,
          instrument: (props.instrument as string) || null,
          resolution: (props.resolution as string) || null
        };
      };

      result.records.forEach(record => {
        const rootRecord = record.get('root') as Node<number> | null;
        const neighborRecord = record.get('neighbor') as Node<number> | null;
        const rel = record.get('r') as Relationship<number> | null;

        if (rootRecord && rootRecord.properties && typeof rootRecord.properties.uid === 'string' && !nodeIds.has(rootRecord.properties.uid)) {
          nodes.push(formatNodeData(rootRecord));
          nodeIds.add(rootRecord.properties.uid);
        }
        if (neighborRecord && neighborRecord.properties && typeof neighborRecord.properties.uid === 'string' && !nodeIds.has(neighborRecord.properties.uid)) {
          nodes.push(formatNodeData(neighborRecord));
          nodeIds.add(neighborRecord.properties.uid);
        }
        if (rel && rootRecord && neighborRecord) {
          const rootProps = rootRecord.properties as Record<string, unknown>;
          const neighborProps = neighborRecord.properties as Record<string, unknown>;
          if (typeof rootProps.uid === 'string' && typeof neighborProps.uid === 'string') {
            links.push({ source: rootProps.uid, target: neighborProps.uid, type: rel.type });
          }
        }
      });
      return { nodes, links };
    } finally {
      await session.close();
    }
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(fetcher, [`graph-${rootUid}`], {
    revalidate: 60,
    tags: [`graph-${rootUid}`]
  })();
}