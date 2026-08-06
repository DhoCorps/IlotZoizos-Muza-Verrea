import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { authOptions } from "../../../../../lib/auth"; 
import { ObservatoryEngine } from '@ilot/shared-core';

export const dynamic = 'force-dynamic';

/**
 * 🌿 INTERFACE DES PARAMÈTRES
 * Standard universel basé sur le [slug]
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR OBSERVATORY]", dbErr);
      return NextResponse.json({ success: false, error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉSOLUTION DES PARAMÈTRES (Next.js 15+)
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 3. CONTRÔLE D'AURA ET DE SOUVERAINETÉ
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ success: false, error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const visitorUid = (session?.user as OiseauUser | undefined)?.uid;
    const visitorCaps = (session?.user as OiseauUser | undefined)?.capabilities || [];

    if (!visitorUid) {
      return NextResponse.json({ success: false, error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    // Seul le propriétaire ou un Administrateur (*) peut ausculter ces données intimes
    const isSelf = visitorUid === targetSlug;
    const isAdmin = visitorCaps.includes('*');

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: "Souveraineté violée : l'auscultation vibratoire d'un autre Oiseau est interdite." 
      }, { status: 403 });
    }

    // -------------------------------------------------------------------------
    // 4. RÉCUPÉRATION DANS LA MATRICE
    // -------------------------------------------------------------------------
    let userProfile;
    try {
      userProfile = await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [OISEAU QUERY ERROR]", queryErr);
      return NextResponse.json({ success: false, error: "Erreur lors de la lecture dans la Silice." }, { status: 500 });
    }

    if (!userProfile) {
      return NextResponse.json({ success: false, error: "Cet Oiseau est introuvable dans la volière." }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // 5. SYNTHÈSE DE LA SÈVE ET AUSCULTATION VIBRATOIRE
    // -------------------------------------------------------------------------
    const observatoryData = {
      dependencies: [
        { id: 'dep-1', status: 1 },
        { id: 'dep-2', status: 1 }
      ],
      tasks: [
        { estimatedTime: 30, realTime: 25, weight: 3 },
        { estimatedTime: 60, realTime: 60, weight: 5 }
      ],
      exchanges: [
        { type: 'GIFT' as const, value: 40 },
        { type: 'TAKE' as const, value: 15 }
      ],
      emotionalIntensity: (userProfile as any).emotionalIntensity || (userProfile as any).entropieActive || 45, 
      currentAcceptance: (userProfile as any).currentAcceptance || 3       
    };

    let report;
    try {
      report = ObservatoryEngine.generateReport(observatoryData);
    } catch (engineErr: any) {
      console.error("🌋 [OBSERVATORY ENGINE ERROR]", engineErr);
      return NextResponse.json({ success: false, error: "Le moteur de sève a échoué." }, { status: 500 });
    }

    const birdName = (userProfile as any).pseudo || (userProfile as any).username || `Oiseau_${targetSlug.slice(-4)}`;

    return NextResponse.json({
      success: true,
      birdName,
      report
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'auscultation :", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur interne" }, { status: 500 });
  }
}