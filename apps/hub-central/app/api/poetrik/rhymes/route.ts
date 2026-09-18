export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { getNeo4jSession } from '@ilot/infrastructure';
import { withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import type { ManagedTransaction, Result } from 'neo4j-driver';

// -------------------------------------------------------------------------
// GET : Interroger le Graphe Neo4j pour trouver les rimes d'un mot
// -------------------------------------------------------------------------
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  let session: ManagedTransaction | any = null;
  try {
    const url = new URL(req.url);
    const wordUid = url.searchParams.get('uid');
    const wordText = url.searchParams.get('word');
    const rhymeType = url.searchParams.get('type'); // rich, poor, assonance

    if (!wordUid && !wordText) {
      return NextResponse.json({ error: "Un identifiant (uid) ou un mot (word) est requis pour chercher des rimes." }, { status: 400 });
    }

    session = getNeo4jSession();
    if (!session) {
      return NextResponse.json({ error: "La Matrice Neo4j est inaccessible." }, { status: 500 });
    }

    // Construction de la requête Cypher dynamique selon les critères
    let cypher = `
      MATCH (w:Word)
      WHERE (w.uid = $wordUid OR toLower(w.word) = toLower($wordText))
      MATCH (w)-[r:RHYMES_WITH]-(rhyme:Word)
    `;

    const params: Record<string, unknown> = {
      wordUid: wordUid || null,
      wordText: wordText || null,
      rhymeType: rhymeType || null
    };

    if (rhymeType) {
      cypher += ` WHERE r.type = $rhymeType `;
    }

    cypher += `
      RETURN rhyme.uid AS uid, 
             rhyme.word AS word, 
             rhyme.languageCode AS languageCode, 
             rhyme.phoneticIpa AS phoneticIpa, 
             rhyme.syllableCount AS syllableCount,
             r.type AS rhymeType,
             r.match AS matchScore
      ORDER BY rhyme.syllableCount ASC
      LIMIT 30
    `;

    const result = await session.run(cypher, params);

    const rhymes = result.records.map((record: Record<string, unknown> | any) => ({
      uid: record.get('uid'),
      word: record.get('word'),
      languageCode: record.get('languageCode'),
      phoneticIpa: record.get('phoneticIpa'),
      syllableCount: typeof record.get('syllableCount')?.toNumber === 'function' ? record.get('syllableCount').toNumber() : record.get('syllableCount'),
      rhymeType: record.get('rhymeType'),
      matchScore: record.get('matchScore')
    }));

    return NextResponse.json({ success: true, data: rhymes }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'POETRIK RHYMES GET ERROR');
  } finally {
    if (session) {
      try { await session.close(); } catch {}
    }
  }
});