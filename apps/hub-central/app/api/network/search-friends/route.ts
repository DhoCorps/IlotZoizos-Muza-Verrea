export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getNeo4jSession } from '@ilot/infrastructure';

// ==========================================
// GET : Autocomplétion des contacts (Neo4j / Aura)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  let sessionNeo4j;
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || url.searchParams.get('query') || '';

    // Si aucun terme n'est saisi, on renvoie une liste vide sans interroger le graphe inutilement
    if (!query.trim()) {
      return NextResponse.json({ success: true, data: [] }, { status: 200 });
    }

    sessionNeo4j = getNeo4jSession();

    // Requête Cypher pour rechercher parmi les utilisateurs de la Canopée
    const cypher = `
      MATCH (u:Oiseau {uid: $userUid})
      MATCH (other:Oiseau)
      WHERE other.uid <> $userUid AND toLower(other.matchPseudo) CONTAINS toLower($searchTerm)
      RETURN other.uid AS uid, other.matchPseudo AS matchPseudo, other.avatarUrl AS avatarUrl
      LIMIT 20
    `;

    const result = await sessionNeo4j.run(cypher, {
      userUid: currentUser.uid,
      searchTerm: query.trim()
    });

    const friends = result.records.map(record => ({
      uid: record.get('uid'),
      matchPseudo: record.get('matchPseudo') || 'Oiseau Inconnu',
      avatarUrl: record.get('avatarUrl') || null
    }));

    return NextResponse.json({ success: true, data: friends }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la recherche des contacts.");
  } finally {
    if (sessionNeo4j) {
      await sessionNeo4j.close().catch((err) => console.error("  [NEO4J CLOSE ERROR]", err));
    }
  }
});