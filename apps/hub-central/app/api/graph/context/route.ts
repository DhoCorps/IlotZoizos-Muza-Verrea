// apps/hub-central/app/api/graph/context/route.ts
import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rootUid = searchParams.get('uid');

  if (!rootUid) return NextResponse.json({ nodes: [], links: [] });

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

      if (rootRecord) {
        const rootFormatted = formatNodeData(rootRecord);
        if (!nodeIds.has(rootFormatted.id)) {
          nodes.push(rootFormatted);
          nodeIds.add(rootFormatted.id);
        }
      }

      if (neighborRecord) {
        const neighborFormatted = formatNodeData(neighborRecord);
        if (neighborFormatted.id && !nodeIds.has(neighborFormatted.id)) {
          nodes.push(neighborFormatted);
          nodeIds.add(neighborFormatted.id);
        }
      }

      if (rel && rootRecord && neighborRecord) {
        const rootProps = rootRecord.properties;
        const neighborProps = neighborRecord.properties;
        if (rootProps?.uid && neighborProps?.uid) {
          links.push({ 
            source: rootProps.uid, 
            target: neighborProps.uid, 
            type: rel.type 
          });
        }
      }
    });

    return NextResponse.json({ nodes, links });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la lecture contextuelle du Graphe :", error);
    return NextResponse.json(
      { nodes: [], links: [], message: "Le maillage est temporairement illisible." },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}