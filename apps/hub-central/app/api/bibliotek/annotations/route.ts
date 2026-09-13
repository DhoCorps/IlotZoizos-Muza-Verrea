export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { AnnotationModel } from '@ilot/infrastructure';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';

// ==========================================
// GET : Lister les Annotations de l'Oiseau (Optionnel Aura / Filtres)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const url = new URL(req.url);
    const bookUid = url.searchParams.get('bookUid');

    const query: any = {};
    if (currentUser?.uid) {
      query.authorUid = currentUser.uid;
    }
    if (bookUid) {
      query.bookUid = bookUid;
    }

    const annotations = await AnnotationModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: annotations }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 [ANNOTATIONS GET ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne lors de la lecture des notes." }, { status: 500 });
  }
});

// ==========================================
// POST : Sceller une nouvelle Annotation / Note de marge (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { bookUid, bookTitle, selectedText, comment, importance, chapterReference } = body;

    if (!bookUid || !bookTitle || !selectedText) {
      return NextResponse.json({ error: "Données incomplètes (bookUid, bookTitle et selectedText requis)." }, { status: 400 });
    }

    const annotationUid = `annot_${randomUUID()}`;
    const newAnnotation = await AnnotationModel.create({
      uid: annotationUid,
      bookUid,
      bookTitle,
      authorUid: currentUser.uid,
      selectedText,
      comment: comment || '',
      importance: Number(importance) || 1,
      chapterReference: chapterReference || null,
    });

    revalidateTag('bibliotek-annotations');
    revalidateTag(`bibliotek-annotations-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: "Note consignée dans le Codex avec succès.",
      data: newAnnotation,
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 [ANNOTATIONS POST ERROR] :", error);
    return NextResponse.json({ error: error.message || "Erreur interne lors du scellage de la note." }, { status: 500 });
  }
});