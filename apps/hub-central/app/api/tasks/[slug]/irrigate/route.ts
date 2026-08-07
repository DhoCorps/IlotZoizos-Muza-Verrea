import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import { TaskIrrigationOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

/**
 * 🌿 INTERFACE DES PARAMÈTRES DE ROUTE
 * Conforme à l'exigence asynchrone de Next.js 15+ pour les segments dynamiques.
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * 💧 POST : Déclenchement de l'Irrigation de la Sève sur un Atome (Tâche)
 * Permet de propager le flux vital et d'évaluer la santé des dépendances de la tâche.
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE (MONGODB)
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TASK IRRIGATE] : Échec de la connexion à la Silice", dbErr);
      return NextResponse.json(
        { error: "La Silice est injoignable. Le flux de la sève est suspendu." }, 
        { status: 500 }
      );
    }
    
    // -------------------------------------------------------------------------
    // 2. SCRUTATION DE L'AURA TERRITORIALE (SESSION NEXT-AUTH)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TASK IRRIGATE] : Fracture de lecture de la session", sessionErr);
      return NextResponse.json(
        { error: "Erreur de lecture d'Aura (session)." }, 
        { status: 500 }
      );
    }

    const actorUid = (session?.user as any)?.uid;
    const capabilities = (session?.user as any)?.capabilities || [];

    // Vérification de la souveraineté de l'Oiseau au seuil
    if (!actorUid) {
      return NextResponse.json(
        { error: "Oiseau non identifié dans la canopée. Accès refusé à l'irrigation." }, 
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // 3. RÉSOLUTION ET SLUGIFICATION DES PARAMÈTRES DYNAMIQUES DE L'URL
    // -------------------------------------------------------------------------
    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      console.error("🔥 [PARAM ERROR TASK IRRIGATE] : Paramètres de route illisibles", paramErr);
      return NextResponse.json(
        { error: "Identifiant de tâche invalide dans la canopée." }, 
        { status: 400 }
      );
    }

    const slug = slugify(rawSlug || '');

    // -------------------------------------------------------------------------
    // 4. FORGE DE LA SIGNATURE ET EXÉCUTION DE L'ORCHESTRATEUR
    // -------------------------------------------------------------------------
    const signature: ActionSignature = {
      actorUid,
      capabilities
    };

    let result;
    try {
      const orchestrator = new TaskIrrigationOrchestrator();
      result = await orchestrator.processTaskIrrigation(slug, signature);
    } catch (orchErr: any) {
      console.error("🌋 [TASK ORCHESTRATOR IRRIGATION ERROR] : Échec de l'orchestration de la sève", orchErr);
      const status = orchErr.status || orchErr.statusCode || 500;
      return NextResponse.json(
        { error: orchErr.message || "Erreur interne de la sève." }, 
        { status }
      );
    }

    // -------------------------------------------------------------------------
    // 5. RETOUR DU FLUX HARMONISÉ
    // -------------------------------------------------------------------------
    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale inattendue lors de l'irrigation de la tâche :", error);
    return NextResponse.json(
      { error: "Erreur interne globale de l'Îlot." }, 
      { status: 500 }
    );
  }
}