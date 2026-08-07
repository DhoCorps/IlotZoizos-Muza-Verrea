import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, TeamModel } from '@ilot/infrastructure';
import { authOptions } from "../../../../../../lib/auth";
import { TransactionManager } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';

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
    // 2. RÉSOLUTION DES PARAMÈTRES (Slugification du Nid uniquement)
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR TEAM INVITATION DELETE]", paramErr);
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }

    const teamSlug = slugify(resolvedParams.slug || '');
    const { targetUid } = resolvedParams; // On laisse targetUid tel quel (ID technique)

    // -------------------------------------------------------------------------
    // 3. IDENTIFICATION DE L'OISEAU (SESSION)
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
    // 4. RÉCUPÉRATION DU NID DANS LA SILICE
    // -------------------------------------------------------------------------
    let team;
    try {
      team = await TeamModel.findOne({ 
        $or: [{ slug: teamSlug }, { uid: teamSlug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TEAM QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture du Nid." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ error: "Nid introuvable dans la Silice." }, { status: 404 });
    }

    const teamId = (team as any).uid;

    // 🛡️ DOUBLE VERROU
    const isNestOwner = (team as any).ownerUid === userUid;
    const isArchitect = (session?.user as any)?.capabilities?.includes('*') || false;

    if (!isNestOwner && !isArchitect) {
      return NextResponse.json({ 
        error: "Aura insuffisante pour révoquer une invitation sur ce territoire." 
      }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // 5. TRANCHAGE (TRANSACTION MANAGER)
    // -------------------------------------------------------------------------
    try {
      await TransactionManager.execute("Révocation d'Invitation", async (mongoSession, neo4jTx) => {
        const cypherRevoke = `
          MATCH (u:User {uid: $targetUid})-[r:INVITED_TO]->(t:Team {uid: $teamId})
          DELETE r
          RETURN 1
        `;
        
        const result = await neo4jTx.run(cypherRevoke, { targetUid, teamId });

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