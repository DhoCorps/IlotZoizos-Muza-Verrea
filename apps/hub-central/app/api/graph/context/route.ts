// apps/hub-central/app/api/graph/context/route.ts
import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rootUid = searchParams.get('uid');

  if (!rootUid) return NextResponse.json({ nodes: [], links: [] });

  const session = getNeo4jSession();
  try {
    // Requête Cypher pour récupérer le contexte immédiat et les ponts transdisciplinaires
    const result = await session.run(`
      MATCH (root {uid: $rootUid})
      OPTIONAL MATCH (root)-[r]-(neighbor)
      RETURN root, r, neighbor
    `, { rootUid });

    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set();

    result.records.forEach(record => {
      const rootRecord = record.get('root');
      const neighborRecord = record.get('neighbor');
      const rel = record.get('r');

      if (rootRecord) {
        const root = rootRecord.properties;
        if (!nodeIds.has(root.uid)) {
          nodes.push({ 
            id: root.uid, 
            name: root.name || root.title || root.pseudo || 'Nœud Racine', 
            type: rootRecord.labels[0] || 'Entity' 
          });
          nodeIds.add(root.uid);
        }
      }

      if (neighborRecord) {
        const neighbor = neighborRecord.properties;
        if (neighbor && neighbor.uid && !nodeIds.has(neighbor.uid)) {
          nodes.push({ 
            id: neighbor.uid, 
            name: neighbor.name || neighbor.title || neighbor.pseudo || neighbor.content?.substring(0, 20) || 'Voisin Connexe', 
            type: neighborRecord.labels[0] || 'Entity' 
          });
          nodeIds.add(neighbor.uid);
        }
      }

      if (rel && rootRecord && neighborRecord) {
        const root = rootRecord.properties;
        const neighbor = neighborRecord.properties;
        if (root?.uid && neighbor?.uid) {
          links.push({ 
            source: root.uid, 
            target: neighbor.uid, 
            type: rel.type 
          });
        }
      }
    });

    return NextResponse.json({ nodes, links });

  } catch (error: any) {
    // 🪡 SUTURE : Le bouclier d'erreur pour éviter le crash brutal du Hub
    console.error("🔥 Fracture lors de la lecture contextuelle du Graphe :", error);
    return NextResponse.json(
      { nodes: [], links: [], message: "Le maillage est temporairement illisible." },
      { status: 500 }
    );
  } finally {
    // 🪡 SUTURE : Fermeture garantie de la session, quoi qu'il arrive
    await session.close();
  }
}