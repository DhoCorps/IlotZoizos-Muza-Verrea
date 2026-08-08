export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { FontProject } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 PUT : Muter un projet de police (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (request: Request, context: ApiContext, _currentUser: OiseauUser) => {
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
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let updated;
    try {
      updated = await FontProject.findOneAndUpdate({ slug }, body, { new: true }).lean();
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
    revalidateTag(`font-${slug}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
});

// ==========================================
// 🗑️ DELETE : Dissoudre un projet de police (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_request: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = (resolvedParams as any)?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let deleted;
    try {
      deleted = await FontProject.findOneAndDelete({ slug });
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
    revalidateTag(`font-${slug}`);

    return NextResponse.json({ success: true, message: "Projet dissous avec succès." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Fonts :", error);
    return NextResponse.json({ error: "Erreur globale interne." }, { status: 500 });
  }
});