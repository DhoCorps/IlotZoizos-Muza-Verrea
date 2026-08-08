export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Résultats du matchmaker par utilisateur (30s) avec bypass en mode test
async function getCachedMatchmakerResults(userUid: string) {
  const fetcher = async () => {
    const sessionNeo4j = getNeo4jSession();
    try {
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

      const result = await sessionNeo4j.run(query, { userUid });
      
      return result.records.map((record: any) => ({
        matchUid: record.get('matchUid'),
        matchPseudo: record.get('matchPseudo') || 'Oiseau Inconnu',
        itemsTheyHaveThatYouWant: (record.get('itemsTheyHaveThatYouWant') || []).filter(Boolean),
        itemsYouHaveThatTheyWant: (record.get('itemsYouHaveThatTheyWant') || []).filter(Boolean)
      })).filter((m: any) => m.itemsTheyHaveThatYouWant.length > 0 || m.itemsYouHaveThatTheyWant.length > 0);

    } finally {
      if (sessionNeo4j) {
        await sessionNeo4j.close().catch((err) => console.error("🔥 [NEO4J CLOSE ERROR]", err));
      }
    }
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  const cacheKey = `matchmaker-user-${userUid}`;
  return await unstable_cache(
    fetcher,
    [cacheKey],
    { revalidate: 30, tags: ['matchmaker', `matchmaker-${userUid}`] }
  )();
}

// ==========================================
// 🤝 GET : Matchmaker Harmonique (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;
    const matches = await getCachedMatchmakerResults(userUid);

    return NextResponse.json({ success: true, matches }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur du Matchmaker Harmonique :", error);
    return NextResponse.json({ error: error.message || "Erreur interne du Matchmaker." }, { status: 500 });
  }
});