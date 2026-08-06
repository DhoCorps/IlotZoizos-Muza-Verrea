import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, TeamModel } from '@ilot/infrastructure'; // 🪡 SUTURE : Import unifié pour que le mock agisse
import { authOptions } from "../../../../../../lib/auth";
import { TransactionManager } from '@ilot/shared-core';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE MULTIPLES
 * Le dossier parent est nommé [slug] et le dossier enfant [targetUid].
 */
interface RouteParams {
  params: Promise<{ slug: string; targetUid: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TEAM INVITATION DELETE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉSOLUTION DES PARAMÈTRES DYNAMIQUES DE L'URL
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR TEAM INVITATION DELETE]", paramErr);
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const { slug, targetUid } = resolvedParams;

    // -------------------------------------------------------------------------
    // 3. IDENTIFICATION DE L'OISEAU À LA GOUVERNANCE (SESSION)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TEAM INVITATION DELETE]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 4. RÉCUPÉRATION DU NID DANS LA SILICE (Supporte slug ou uid)
    // -------------------------------------------------------------------------
    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: slug }, { uid: slug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    const teamId = (team as any).uid; // On extrait le véritable uid pour Neo4j

    // 🛡️ LE DOUBLE VERROU : Seul le propriétaire du Nid ou un architecte (*) peut révoquer
    const isNestOwner = (team as any).ownerUid === userUid;
    const isArchitect = (session?.user as any)?.capabilities?.includes('*') || false;

    if (!isNestOwner && !isArchitect) {
      return NextResponse.json({ 
        error: "Aura insuffisante pour révoquer une invitation sur ce territoire." 
      }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // 5. EXÉCUTION DU TRANCHAGE AU SEIN DU GESTIONNAIRE DE TRANSACTION UNIFIÉ
    // -------------------------------------------------------------------------
    try {
      await TransactionManager.execute("Révocation d'Invitation", async (mongoSession, neo4jTx) => {
        const cypherRevoke = `
          MATCH (u:User {uid: $targetUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          RETURN 1
        `;
        
        const result = await neo4jTx.run(cypherRevoke, { 
          targetUid, 
          teamId 
        });

        if (result.records.length === 0) {
          throw new Error("Aucune invitation active ou en attente trouvée pour cet oiseau.");
        }
        
        console.log(`⚡ [Gouvernance] Invitation révoquée : Oiseau ${targetUid} retiré du Nid ${teamId} par ${userUid}`);
        
        return true;
      });
    } catch (txErr: any) {
      console.error("🌋 [TRANSACTION REVOKE ERROR]", txErr);
      const status = txErr.status || txErr.statusCode || 400;
      return NextResponse.json({ error: txErr.message || "L'action de gouvernance a échoué." }, { status });
    }

    return NextResponse.json({ 
      success: true, 
      message: "L'invitation a été révoquée et les fréquences ont été nettoyées." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de la révocation de l'invitation :", error);
    return NextResponse.json({ error: error.message || "L'action de gouvernance a échoué." }, { status: 500 });
  }
}