// apps/hub-central/app/api/users/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next'; 
import { connectToDatabase } from "@ilot/infrastructure/src/database/mongoose";
import { OiseauModel } from "@ilot/infrastructure/src/database/models/nosql/user.model";
import { readFromGraph } from "@ilot/infrastructure/src/database/neo4j";

export async function GET(req: Request) {
  try {
    // 🛡️ Passage obligatoire par la Douane (Sécurité contrôlée)
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Garde-frontière : Accès non autorisé, session manquante." }, 
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    // Ajout d'une option pour inclure ou non la résonance du graphe pour alléger la requête si besoin
    const withResonance = searchParams.get('withResonance') === 'true'; 

    await connectToDatabase();
    
    let query: any = {};

    // 🏗️ Harmonisation sémantique : On utilise 'pseudo' et 'frequenceHEX'
    if (search) {
      query.$or = [
        { pseudo: { $regex: search, $options: 'i' } },
        { frequenceHEX: { $regex: search, $options: 'i' } },
        // Permet aussi de chercher par uid si on a l'identifiant strict
        { uid: search }
      ];
    }

    // 🛰️ Récupération des oiseaux dans MongoDB (Profil de base)
    const oiseauxMongo = await OiseauModel.find(query)
      .select('-password -email') // DOUBLE SÉCURITÉ : on s'assure d'exclure les données sensibles même si le lean() le fait
      .limit(20) 
      .lean();

    // 🕸️ LE CORRECTIF DU BUG NEO4J : L'Écho Relationnel
    // Si la requête demande la "résonance" (les amis/connexions), on interroge le Graphe.
    let finalOiseaux = oiseauxMongo;

    if (withResonance && oiseauxMongo.length > 0) {
      const uids = oiseauxMongo.map(o => (o as any).uid);

      // On interroge Neo4j pour connaître le nombre de liens (ex: amis, guildes) pour chaque oiseau trouvé
      const cypher = `
        MATCH (o:Oiseau)
        WHERE o.uid IN $uids
        OPTIONAL MATCH (o)-[r:CONNECTE_A]->(autre)
        RETURN o.uid AS uid, count(r) AS resonanceCount
      `;
      
      const graphRecords = await readFromGraph(cypher, { uids });
      
      // On fusionne les données Mongo avec les métadonnées Neo4j
      finalOiseaux = oiseauxMongo.map((oiseauMongo: any) => {
        const graphData = graphRecords.find(record => record.uid === oiseauMongo.uid);
        return {
          ...oiseauMongo,
          resonance: graphData ? graphData.resonanceCount : 0
        };
      });
    }

    // 📦 Enveloppe pour l'intégrité de l'API
    return NextResponse.json({ results: finalOiseaux }, { status: 200 });
    
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement (GET /api/users) :", error.message);
    return NextResponse.json(
      { error: "Le Nexus n'a pas pu lister les oiseaux. " + (process.env.NODE_ENV === 'development' ? error.message : "") }, 
      { status: 500 }
    );
  }
}