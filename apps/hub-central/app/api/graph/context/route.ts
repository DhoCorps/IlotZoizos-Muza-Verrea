// apps/hub-central/app/api/graph/context/route.ts
import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rootUid = searchParams.get('uid');

  if (!rootUid) return NextResponse.json({ nodes: [], links: [] });

  const session = getNeo4jSession();
  try {
    // Requête Cypher pour récupérer le contexte immédiat [cite: 2026-03-09]
    const result = await session.run(`
      MATCH (root {uid: $rootUid})
      OPTIONAL MATCH (root)-[r]-(neighbor)
      RETURN root, r, neighbor
    `, { rootUid });

    const nodes: any[] = [];
    const links: any[] = [];
    const nodeIds = new Set();

    result.records.forEach(record => {
      const root = record.get('root').properties;
      const neighbor = record.get('neighbor')?.properties;
      const rel = record.get('r');

      if (!nodeIds.has(root.uid)) {
        nodes.push({ id: root.uid, name: root.name || root.title, type: record.get('root').labels[0] });
        nodeIds.add(root.uid);
      }

      if (neighbor && !nodeIds.has(neighbor.uid)) {
        nodes.push({ id: neighbor.uid, name: neighbor.name || neighbor.title, type: record.get('neighbor').labels[0] });
        nodeIds.add(neighbor.uid);
      }

      if (rel) {
        links.push({ source: root.uid, target: neighbor.uid, type: rel.type });
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