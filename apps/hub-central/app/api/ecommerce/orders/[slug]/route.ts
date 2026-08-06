import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase, OrderModel } from '@ilot/infrastructure';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une commande spécifique
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR ORDER GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR ORDER GET]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let order;
    try {
      order = await OrderModel.findOne({ 
        $or: [{ uid: slug }, { _id: mongoose.isValidObjectId(slug) ? slug : null }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [ORDER QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture dans le grand livre." }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable dans le grand livre de l'Îlot." }, { status: 404 });
    }

    const isAdmin = (session?.user as any)?.capabilities?.includes('ADMIN');
    if ((order as any).buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Accès refusé à cette transaction." }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur GET Order Details :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// PATCH : Mettre à jour le statut d'une commande
// ==========================================
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR ORDER PATCH]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let slug;
    try {
      const resolvedParams = await params;
      slug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Identifiant de commande invalide." }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR ORDER PATCH]", sessionErr);
      return NextResponse.json({ error: "Erreur de session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    let order;
    try {
      order = await OrderModel.findOne({ 
        $or: [{ uid: slug }, { _id: mongoose.isValidObjectId(slug) ? slug : null }] 
      });
    } catch (queryErr) {
      console.error("🔥 [ORDER PATCH QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture dans la base." }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const isAdmin = (session?.user as any)?.capabilities?.includes('ADMIN');
    if ((order as any).buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Action non autorisée sur cette commande." }, { status: 403 });
    }

    if (body.status && ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
      (order as any).status = body.status;
      try {
        await (order as any).save();
      } catch (saveErr) {
        console.error("🔥 [ORDER SAVE ERROR]", saveErr);
        return NextResponse.json({ error: "Échec de la sauvegarde du nouveau statut." }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "✨ Statut de la commande mis à jour avec succès.", 
      data: order 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur PATCH Order :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}