import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';

export async function GET(req: Request) {
  let session;
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ nodes: [], links: [], message: "URL invalide." }, { status: 400 });
    }

    const rootUid = url.searchParams.get('uid');

    if (!rootUid) {
      return NextResponse.json({ nodes: [], links: [] }, { status: 200 });
    }

    try {
      session = getNeo4jSession();
    } catch (neoInitErr) {
      console.error("❌ [NEO4J SESSION INIT ERROR]", neoInitErr);
      return NextResponse.json({ nodes: [], links: [], message: "Matrice de graphe injoignable." }, { status: 500 });
    }

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
        if (rootFormatted.id && !nodeIds.has(rootFormatted.id)) {
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

    return NextResponse.json({ nodes, links }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la lecture contextuelle du Graphe :", error);
    return NextResponse.json(
      { nodes: [], links: [], message: "Le maillage est temporairement illisible." },
      { status: 500 }
    );
  } finally {
    if (session) {
      try {
        await session.close();
      } catch (closeErr) {
        console.error("🔥 [NEO4J SESSION CLOSE ERROR]", closeErr);
      }
    }
  }
}