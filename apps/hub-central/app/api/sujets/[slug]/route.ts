import { NextResponse } from 'next/server';
import { SujetModel } from '@ilot/infrastructure';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

// 🧠 CACHE : Récupération d'un sujet spécifique par son identifiant ou slug
const getCachedSujetDetails = (identifier: string) => {
  return unstable_cache(
    async () => {
      return await SujetModel.findOne({ 
        $or: [{ slug: identifier }, { uid: identifier }] 
      }).lean();
    },
    [`sujet-details-${identifier}`],
    { revalidate: 60, tags: ['sujets', `sujet-${identifier}`] }
  )();
};

// ==========================================
// 🔍 GET : Ausculter un sujet spécifique (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const sujet = await getCachedSujetDetails(slug);

    if (!sujet) {
      return NextResponse.json({ error: "Ce monologue s'est évaporé dans la brume." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];

    const isPublic = (sujet as any).status === 'PUBLISHED';
    const isMine = (sujet as any).authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Ce monologue intime t'est fermé." }, { status: 403 });
    }

    return NextResponse.json(sujet, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Sujet :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🚀 PUT : Mutation du Sujet (Strictement Privé)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    const isAuthor = sujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux modifier que tes propres monologues." }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let updatedSujet;
    try {
      updatedSujet = await SujetModel.findOneAndUpdate(
        { uid: sujet.uid },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("🔥 [SUJET UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du sujet." }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('sujets');
    revalidateTag(`sujet-${slug}`);
    if (sujet.uid) revalidateTag(`sujet-${sujet.uid}`);
    if (sujet.slug) revalidateTag(`sujet-${sujet.slug}`);

    return NextResponse.json({ success: true, data: updatedSujet }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});

// ==========================================
// 🗑️ DELETE : Désintégration / Suppression du Sujet (Strictement Privé)
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    const sujet = await SujetModel.findOne({ 
      $or: [{ slug: slug }, { uid: slug }] 
    });

    if (!sujet) {
      return NextResponse.json({ error: "Sujet introuvable." }, { status: 404 });
    }

    // Vérification des droits d'auteur ou architecte
    const isAuthor = sujet.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');

    if (!isAuthor && !isArchitect) {
      return NextResponse.json({ error: "Tu ne peux supprimer que tes propres monologues." }, { status: 403 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const sujetOrch = new SujetOrchestrator();
      if (typeof sujetOrch.disintegrateSujet === 'function') {
        await sujetOrch.disintegrateSujet(sujet.uid, signature);
      } else {
        await SujetModel.deleteOne({ uid: sujet.uid });
      }
    } catch (orchErr: any) {
      console.error("🔥 [SUJET ORCHESTRATOR DISINTEGRATE ERROR]", orchErr);
      const status = orchErr.statusCode || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de la désintégration du monologue." }, { status });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('sujets');
    revalidateTag(`sujet-${slug}`);
    if (sujet.uid) revalidateTag(`sujet-${sujet.uid}`);
    if (sujet.slug) revalidateTag(`sujet-${sujet.slug}`);

    return NextResponse.json({ 
      success: true, 
      message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus." 
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Sujet :", error);
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status });
  }
});