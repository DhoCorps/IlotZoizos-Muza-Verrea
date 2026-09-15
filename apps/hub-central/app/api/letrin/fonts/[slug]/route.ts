export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { FontProject, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 PUT : Muter un projet de police (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (request: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await request.json();
    } catch (err) {
      return NextResponse.json({ error: "Requête ou paramètres invalides." }, { status: 400 });
    }

    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée par slug ou UID
    const targetProject: any = await findEntityBySlugOrUid(FontProject, identifier, { lean: false });
    if (!targetProject) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetProject.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : tu ne peux altérer cette typographie." }, { status: 403 });
    }

    let updated;
    try {
      updated = await FontProject.findOneAndUpdate({ uid: targetProject.uid }, body, { new: true }).lean();
    } catch (updateErr) {
      console.error("🔥 [FONTS PUT UPDATE ERROR]", updateErr);
      return NextResponse.json({ error: "Échec de la mutation du projet." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Projet introuvable." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('font-projects');
    revalidateTag(`font-${identifier}`);
    if ((updated as any).slug) {
      revalidateTag(`font-${(updated as any).slug}`);
    }
    if ((updated as any).uid) {
      revalidateTag(`font-${(updated as any).uid}`);
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
});

// ==========================================
// 🗑️ DELETE : Dissoudre un projet de police (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_request: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = (resolvedParams as any)?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Recherche unifiée par slug ou UID pour cibler la suppression
    const targetProject: any = await findEntityBySlugOrUid(FontProject, identifier);
    if (!targetProject) {
      return NextResponse.json({ error: "Projet introuvable pour dissolution." }, { status: 404 });
    }

    // 🛡️ Contrôle de souveraineté strict
    const isOwner = targetProject.authorUid === currentUser.uid;
    const isArchitect = currentUser.capabilities?.includes('*');
    if (!isOwner && !isArchitect) {
      return NextResponse.json({ error: "Souveraineté violée : dissolution interdite." }, { status: 403 });
    }

    let deleted;
    try {
      deleted = await FontProject.findOneAndDelete({ uid: targetProject.uid });
    } catch (delErr) {
      console.error("🔥 [FONTS DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Échec de la dissolution du projet." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Projet introuvable pour dissolution." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('font-projects');
    revalidateTag(`font-${identifier}`);
    revalidateTag(`font-${targetProject.uid}`);

    return NextResponse.json({ success: true, message: "Projet dissous avec succès." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
});