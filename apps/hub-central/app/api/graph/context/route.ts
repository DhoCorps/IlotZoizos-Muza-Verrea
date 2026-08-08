export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Résultats du graphe (60s) avec bypass en mode test
async function getCachedGraphData(rootUid: string) {
  const fetcher = async () => {
    const session = getNeo4jSession();
    try {
      const result = await session.run(`
        MATCH (root {uid: $rootUid})
        OPTIONAL MATCH (root)-[r]-(neighbor)
        RETURN root, r, neighbor
      `, { rootUid });

      const nodes: any[] = [];
      const links: any[] = [];
      const nodeIds = new Set();

      const formatNodeData = (recordNode: any) => {
        const props = recordNode.properties;
        const label = recordNode.labels[0] || 'Entity';
        return {
          id: props.uid,
          name: props.name || props.title || props.pseudo || props.content?.substring(0, 20) || 'Entité Sans Nom',
          type: label,
          frequency: props.frequenceHEX || props.color || null,
          status: props.status || props.visibility || null,
          energyWeight: props.energyWeight || null,
          instrument: props.instrument || null,
          resolution: props.resolution || null
        };
      };

      result.records.forEach(record => {
        const rootRecord = record.get('root');
        const neighborRecord = record.get('neighbor');
        const rel = record.get('r');

        if (rootRecord && rootRecord.properties.uid && !nodeIds.has(rootRecord.properties.uid)) {
          nodes.push(formatNodeData(rootRecord));
          nodeIds.add(rootRecord.properties.uid);
        }
        if (neighborRecord && neighborRecord.properties.uid && !nodeIds.has(neighborRecord.properties.uid)) {
          nodes.push(formatNodeData(neighborRecord));
          nodeIds.add(neighborRecord.properties.uid);
        }
        if (rel && rootRecord && neighborRecord) {
          links.push({ source: rootRecord.properties.uid, target: neighborRecord.properties.uid, type: rel.type });
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

export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const url = new URL(req.url);
    const rootUid = url.searchParams.get('uid');

    if (!rootUid) {
      return NextResponse.json({ nodes: [], links: [] }, { status: 200 });
    }

    const data = await getCachedGraphData(rootUid);
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la lecture contextuelle du Graphe :", error);
    return NextResponse.json({ nodes: [], links: [], message: "Le maillage est illisible." }, { status: 500 });
  }
});