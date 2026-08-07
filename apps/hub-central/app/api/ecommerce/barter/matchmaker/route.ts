export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Record } from 'neo4j-driver';

export async function GET(req: Request) {
  let sessionNeo4j;
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR MATCHMAKER]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;

    try {
      sessionNeo4j = getNeo4jSession();
    } catch (neoInitErr) {
      console.error("❌ [NEO4J MATCHMAKER SESSION ERROR]", neoInitErr);
      return NextResponse.json({ error: "Matrice de graphe injoignable." }, { status: 500 });
    }

    const query = `
      MATCH (u:Oiseau {uid: $userUid})
      MATCH (other:Oiseau) WHERE other.uid <> $userUid
      
      OPTIONAL MATCH (u)-[:WANTS]->(p:Product)<-[:OWNS]-(other)
      OPTIONAL MATCH (other)-[:WANTS]->(p2:Product)<-[:OWNS]-(u)
      
      RETURN other.uid AS matchUid, 
             other.pseudo AS matchPseudo, 
             collect(DISTINCT p.uid) AS itemsTheyHaveThatYouWant,
             collect(DISTINCT p2.uid) AS itemsYouHaveThatTheyWant
      LIMIT 5
    `;

    let result;
    try {
      result = await sessionNeo4j.run(query, { userUid });
    } catch (cypherErr) {
      console.error("🔥 [CYPHER QUERY ERROR]", cypherErr);
      return NextResponse.json({ error: "Échec de l'auscultation du graphe." }, { status: 500 });
    }
    
    const matches = result.records.map((record: Record) => ({
      matchUid: record.get('matchUid'),
      matchPseudo: record.get('matchPseudo') || 'Oiseau Inconnu',
      itemsTheyHaveThatYouWant: record.get('itemsTheyHaveThatYouWant') || [],
      itemsYouHaveThatTheyWant: record.get('itemsYouHaveThatTheyWant') || []
    })).filter(m => m.itemsTheyHaveThatYouWant.length > 0 || m.itemsYouHaveThatTheyWant.length > 0);

    return NextResponse.json({ success: true, matches }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur du Matchmaker Harmonique :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du Matchmaker." }, { status: 500 });
  } finally {
    if (sessionNeo4j) {
      try {
        await sessionNeo4j.close();
      } catch (closeErr) {
        console.error("🔥 [NEO4J CLOSE ERROR]", closeErr);
      }
    }
  }
}