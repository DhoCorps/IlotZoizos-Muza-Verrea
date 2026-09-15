import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { TaskResonanceOrchestrator, ResonanceOrchestrator } from '@ilot/shared-core';
import { ActionSignature, ResonanceType, IResonancePayload } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// ==========================================
// 🎼 POST : La Résonance (Tisser ou Rompre)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et typée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant de cible invalide." }, { status: 400 });
    }

    const signature: ActionSignature = { 
      actorUid: currentUser.uid, 
      capabilities: currentUser.capabilities 
    };

    // 2. Parsage du corps de la requête
    let body: Record<string, any> = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide." }, { status: 400 });
    }

    const { action, type, entityId } = body;

    // ---------------------------------------------------------------------
    // 5A. MODE ABONNEMENT (WEAVE / SEVER)
    // ---------------------------------------------------------------------
    if (action === 'WEAVE' || action === 'SEVER') {
      // On ne résonne pas avec soi-même
      if (currentUser.uid === identifier || slugify(currentUser.uid) === identifier) {
        return NextResponse.json({ error: "On ne peut résonner avec soi-même." }, { status: 400 });
      }

      if (!type) {
        return NextResponse.json({ error: "Fréquence (type) requise." }, { status: 400 });
      }

      // 🔍 Recherche unifiée de la cible via notre helper centralisé
      const targetUser: any = await findEntityBySlugOrUid(OiseauModel, identifier);

      if (!targetUser) {
        return NextResponse.json({ error: "La cible a disparu de la matrice." }, { status: 404 });
      }

      const payload: IResonancePayload = {
        sourceUid: currentUser.uid,
        targetUid: targetUser.uid,
        type: type as ResonanceType,
        entityId
      };

      if (action === 'WEAVE') {
        const isHarmonic = await ResonanceOrchestrator.weaveResonance(payload);
        
        if (type === 'FOLLOWS_GLOBAL') {
           await OiseauModel.updateOne({ uid: targetUser.uid }, { $inc: { followersCount: 1 } });
           await OiseauModel.updateOne({ uid: currentUser.uid }, { $inc: { followingCount: 1 } });
        }

        // 💥 BOOM ! On invalide le cache des DEUX profils en cascade
        revalidateTag(`profile-${identifier}`);
        if (targetUser.slug) revalidateTag(`profile-${targetUser.slug}`);
        if (targetUser.uid) revalidateTag(`profile-${targetUser.uid}`);
        revalidateTag(`profile-${currentUser.uid}`);
        revalidateTag('users');

        return NextResponse.json({ success: true, message: "Les fils sont liés.", isHarmonic }, { status: 200 });

      } else { // SEVER
        await ResonanceOrchestrator.severResonance(payload);

        if (type === 'FOLLOWS_GLOBAL') {
           await OiseauModel.updateOne({ uid: targetUser.uid }, { $inc: { followersCount: -1 } });
           await OiseauModel.updateOne({ uid: currentUser.uid }, { $inc: { followingCount: -1 } });
        }

        // 💥 BOOM ! On invalide le cache des DEUX profils en cascade
        revalidateTag(`profile-${identifier}`);
        if (targetUser.slug) revalidateTag(`profile-${targetUser.slug}`);
        if (targetUser.uid) revalidateTag(`profile-${targetUser.uid}`);
        revalidateTag(`profile-${currentUser.uid}`);
        revalidateTag('users');

        return NextResponse.json({ success: true, message: "Le lien a été rompu.", isHarmonic: false }, { status: 200 });
      }
    }

    // ---------------------------------------------------------------------
    // 5B. MODE CALCUL (COMPORTEMENT HISTORIQUE PAR DÉFAUT)
    // ---------------------------------------------------------------------
    try {
      const taskOrchestrator = new TaskResonanceOrchestrator();
      const result = await taskOrchestrator.processUserTaskResonance(identifier, signature);
      return NextResponse.json(result, { status: 200 });
    } catch (orchErr: any) {
      console.error("🌋 [ORCHESTRATOR RESONANCE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 400;
      return NextResponse.json({ error: orchErr.message || "Échec du calcul de la résonance." }, { status });
    }

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'appel de résonance :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de résonance." }, { status: 500 });
  }
});