// apps/hub-central/app/api/users/[slug]/resonance/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth"; // Ajuste le chemin si besoin
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { TaskResonanceOrchestrator, ResonanceOrchestrator } from '@ilot/shared-core';
import { ActionSignature, ResonanceType, IResonancePayload } from '@ilot/types';

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

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR USER RESONANCE]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉSOLUTION DES PARAMÈTRES
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 3. IDENTIFICATION DE L'OISEAU (L'AURA)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const actorUid = (session?.user as OiseauUser | undefined)?.uid;
    const capabilities = (session?.user as OiseauUser | undefined)?.capabilities || [];

    if (!actorUid) {
      return NextResponse.json({ error: "Oiseau non identifié dans la canopée." }, { status: 401 });
    }

    const signature: ActionSignature = { actorUid, capabilities };

    // -------------------------------------------------------------------------
    // 4. PARSAGE DU CORPS DE REQUÊTE (Aiguillage)
    // -------------------------------------------------------------------------
    let body: any = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) {
      // Body optionnel, on ignore l'erreur de parsage
    }

    const { action, type, entityId } = body;

    // -------------------------------------------------------------------------
    // 5A. MODE ABONNEMENT (WEAVE / SEVER)
    // -------------------------------------------------------------------------
    if (action === 'WEAVE' || action === 'SEVER') {
      if (actorUid === targetSlug) {
        return NextResponse.json({ error: "On ne peut résonner avec soi-même." }, { status: 400 });
      }

      if (!type) {
        return NextResponse.json({ error: "Fréquence (type) requise." }, { status: 400 });
      }

      const targetUser = (await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean()) as any;

      if (!targetUser) {
        return NextResponse.json({ error: "La cible a disparu de la matrice." }, { status: 404 });
      }

      const payload: IResonancePayload = {
        sourceUid: actorUid,
        targetUid: targetUser.uid,
        type: type as ResonanceType,
        entityId
      };

      if (action === 'WEAVE') {
        // 🕸️ Appel statique
        const isHarmonic = await ResonanceOrchestrator.weaveResonance(payload);
        
        if (type === 'FOLLOWS_GLOBAL') {
           await OiseauModel.updateOne({ uid: targetUser.uid }, { $inc: { followersCount: 1 } });
           await OiseauModel.updateOne({ uid: actorUid }, { $inc: { followingCount: 1 } });
        }

        return NextResponse.json({ success: true, message: "Les fils sont liés.", isHarmonic }, { status: 200 });

      } else { // SEVER
        // ✂️ Appel statique
        await ResonanceOrchestrator.severResonance(payload);

        if (type === 'FOLLOWS_GLOBAL') {
           await OiseauModel.updateOne({ uid: targetUser.uid }, { $inc: { followersCount: -1 } });
           await OiseauModel.updateOne({ uid: actorUid }, { $inc: { followingCount: -1 } });
        }

        return NextResponse.json({ success: true, message: "Le lien a été rompu.", isHarmonic: false }, { status: 200 });
      }
    }

    // -------------------------------------------------------------------------
    // 5B. MODE CALCUL (COMPORTEMENT HISTORIQUE PAR DÉFAUT)
    // -------------------------------------------------------------------------
    let result;
    try {
      const taskOrchestrator = new TaskResonanceOrchestrator();
      result = await taskOrchestrator.processUserTaskResonance(targetSlug, signature);
    } catch (orchErr: any) {
      console.error("🌋 [ORCHESTRATOR RESONANCE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 400;
      return NextResponse.json({ error: orchErr.message || "Échec du calcul de la résonance." }, { status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'appel de résonance :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de résonance." }, { status: 500 });
  }
}