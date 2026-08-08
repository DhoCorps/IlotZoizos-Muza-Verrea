export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { LetterSpriteModel } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Récupération d'une police par slug (60s) avec bypass en mode test
async function getCachedFontDetail(slug: string) {
  const fetcher = async () => {
    return await LetterSpriteModel.findOne({ slug }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`letrin-font-${slug}`],
    { revalidate: 60, tags: ['fonts', 'letrin', `font-${slug}`] }
  )();
}

// ==========================================
// 🔍 GET : Consulter une police par son slug (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, context: ApiContext) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (err) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const font = await getCachedFontDetail(slug);

    if (!font) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    return NextResponse.json(font, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});

// ==========================================
// 🚀 PUT : Muter une police (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let updated;
    try {
      updated = await LetterSpriteModel.findOneAndUpdate(
        { slug },
        { $set: body },
        { new: true }
      ).lean();
    } catch (updateErr) {
      console.error("🔥 [SPRITE PUT ERROR]", updateErr);
      return NextResponse.json({ error: "Fracture lors de la mutation." }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${slug}`);

    return NextResponse.json({ success: true, data: updated }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});

// ==========================================
// 🗑️ DELETE : Dissoudre une police (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (_req: Request, context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (err) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let deleted;
    try {
      deleted = await LetterSpriteModel.findOneAndDelete({ slug });
    } catch (delErr) {
      console.error("🔥 [SPRITE DELETE ERROR]", delErr);
      return NextResponse.json({ error: "Erreur lors de la dissolution." }, { status: 500 });
    }

    if (!deleted) {
      return NextResponse.json({ error: "Police introuvable." }, { status: 404 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('letrin');
    revalidateTag(`font-${slug}`);

    return NextResponse.json({ success: true, message: "Police dissoute avec succès." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Letr'In Sprite Slug :", error);
    return NextResponse.json({ error: "Erreur globale." }, { status: 500 });
  }
});