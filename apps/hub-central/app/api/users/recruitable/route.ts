import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel, getNeo4jSession } from "@ilot/infrastructure"; 
import { authOptions } from "@/lib/auth"; // Ajuste le chemin selon ton arborescence

export const dynamic = 'force-dynamic';

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

/**
 * 🔍 GET : Recensement des Oiseaux RECRUTABLES pour un Nid spécifique
 * /api/users/recruitable?teamSlug=nid-alpha&search=Artisan
 */
export async function GET(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR RECRUITABLE GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. DOUANE : SÉCURISATION DE L'ACCÈS
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const currentUid = (session?.user as OiseauUser | undefined)?.uid;
    if (!currentUid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 3. VALIDATION DES PARAMÈTRES DE RECHERCHE
    // -------------------------------------------------------------------------
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const teamSlug = searchParams.get('teamSlug');

    if (!teamSlug) {
      return NextResponse.json({ error: "L'onde manque de précision : le teamSlug est requis." }, { status: 400 });
    }

    // -------------------------------------------------------------------------
    // 4. LE BOUCLIER DU GRAPHE (Neo4j) - Exclusion des membres existants
    // -------------------------------------------------------------------------
    const neoSession = getNeo4jSession();
    // On exclut d'office l'utilisateur qui fait la recherche
    const excludedUids: string[] = [currentUid]; 

    try {
      const cypher = `
        MATCH (u:User)-[:FOUNDED|MEMBER_OF|INVITED_TO]->(t:Team)
        WHERE t.slug = $teamSlug OR t.uid = $teamSlug
        RETURN u.uid AS uid
      `;
      const result = await neoSession.run(cypher, { teamSlug });
      
      result.records.forEach(record => {
        const u = record.get('uid');
        if (u && !excludedUids.includes(u)) {
          excludedUids.push(u);
        }
      });
    } catch (neoErr) {
      console.error("🔥 [NEO4J RECRUITABLE ERROR]", neoErr);
      return NextResponse.json({ error: "Le Graphe est momentanément muet." }, { status: 500 });
    } finally {
      try { await neoSession.close(); } catch (e) {}
    }

    // -------------------------------------------------------------------------
    // 5. LA RECHERCHE DANS LA SILICE (MongoDB)
    // -------------------------------------------------------------------------
    // On filtre impérativement tous ceux qui sont dans excludedUids
    let query: any = { uid: { $nin: excludedUids } };

    if (search) {
      query.$or = [
        { slug: { $regex: search, $options: 'i' } },
        { pseudo: { $regex: search, $options: 'i' } },
        { capabilities: { $regex: search, $options: 'i' } } 
      ];
    }

    // 🛰️ Extraction chirurgicale
    const recruitableUsers = await OiseauModel.find(query)
      .select('uid slug pseudo frequenceHEX capabilities avatarUrl signature') 
      .limit(20) 
      .lean();

    return NextResponse.json(recruitableUsers, { status: 200 });

  } catch (error) {
    console.error("🔥 Erreur lors du recensement des recrues :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux recrutables." }, { status: 500 });
  }
}