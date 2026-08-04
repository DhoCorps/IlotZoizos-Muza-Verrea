// apps/hub-central/app/api/ecommerce/barter/matchmaker/route.ts

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";

/**
 * 🔄 LE BARTER HARMONIQUE : Matchmaker basé sur le Graphe Neo4j
 * Croise les souhaits (Wishlists / Requêtes) et les artefacts offerts par les Oiseaux
 * pour suggérer des ponts d'échange par affinité relationnelle.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;
    const sessionNeo4j = getNeo4jSession();

    try {
      // Requête Cypher pour trouver des correspondances harmoniques :
      // Trouve un autre utilisateur qui possède ce que l'utilisateur courant recherche,
      // ou qui recherche ce que l'utilisateur courant propose.
      const query = `
        MATCH (u:Oiseau {uid: $userUid})
        MATCH (other:Oiseau) WHERE other.uid <> $userUid
        
        // Recherche des ponts d'intérêt communs ou croisés dans le graphe
        OPTIONAL MATCH (u)-[:WANTS]->(p:Product)<-[:OWNS]-(other)
        OPTIONAL MATCH (other)-[:WANTS]->(p2:Product)<-[:OWNS]-(u)
        
        RETURN other.uid AS matchUid, 
               other.pseudo AS matchPseudo, 
               collect(DISTINCT p.uid) AS itemsTheyHaveThatYouWant,
               collect(DISTINCT p2.uid) AS itemsYouHaveThatTheyWant
        LIMIT 5
      `;

      const result = await sessionNeo4j.run(query, { userUid });
      
      const matches = result.records.map(record => ({
        matchUid: record.get('matchUid'),
        matchPseudo: record.get('matchPseudo') || 'Oiseau Inconnu',
        itemsTheyHaveThatYouWant: record.get('itemsTheyHaveThatYouWant') || [],
        itemsYouHaveThatTheyWant: record.get('itemsYouHaveThatTheyWant') || []
      })).filter(m => m.itemsTheyHaveThatYouWant.length > 0 || m.itemsYouHaveThatTheyWant.length > 0);

      return NextResponse.json({ success: true, matches }, { status: 200 });

    } finally {
      await sessionNeo4j.close();
    }

  } catch (error: any) {
    console.error("🔥 Erreur du Matchmaker Harmonique :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}