export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { AnnotationModel, LibraryBookModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { slugify } from '@/lib/slugify';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';

// ==========================================
// GET : Lister les annotations d'un ouvrage spécifique
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const book = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!book) {
      return NextResponse.json({ error: "Ouvrage introuvable." }, { status: 404 });
    }

    const query: any = { bookUid: (book as any).uid };
    if (currentUser?.uid) {
      query.authorUid = currentUser.uid;
    }

    const annotations = await AnnotationModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: annotations }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 [BOOK ANNOTATIONS GET ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// POST : Créer une annotation rattachée à cet ouvrage (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const book = await findEntityBySlugOrUid(LibraryBookModel, identifier);
    if (!book) {
      return NextResponse.json({ error: "Ouvrage introuvable." }, { status: 404 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { selectedText, comment, importance, chapterReference } = body;
    if (!selectedText) {
      return NextResponse.json({ error: "Le texte surligné (selectedText) est requis." }, { status: 400 });
    }

    const annotationUid = `annot_${randomUUID()}`;
    const newAnnotation = await AnnotationModel.create({
      uid: annotationUid,
      bookUid: (book as any).uid,
      bookTitle: (book as any).title,
      authorUid: currentUser.uid,
      selectedText,
      comment: comment || '',
      importance: Number(importance) || 1,
      chapterReference: chapterReference || null,
    });

    revalidateTag('bibliotek-annotations');
    revalidateTag(`bibliotek-annotations-${(book as any).uid}`);

    return NextResponse.json({
      success: true,
      message: "Note consignée pour cet ouvrage.",
      data: newAnnotation,
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 [BOOK ANNOTATIONS POST ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});