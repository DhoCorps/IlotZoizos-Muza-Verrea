export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { AnnotationModel } from '@ilot/infrastructure';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod strict pour la création d'annotation globale
const CreateAnnotationSchema = z.object({
  bookUid: z.string().min(1, "L'UID du livre est requis."),
  bookTitle: z.string().min(1, "Le titre du livre est requis."),
  selectedText: z.string().min(1, "Le texte sélectionné est requis."),
  comment: z.string().optional().default(''),
  importance: z.number().int().min(1).max(5).optional().default(1),
  chapterReference: z.string().optional().nullable(),
});

// ==========================================
// GET : Lister les Annotations de l'Oiseau (Optionnel Aura / Filtres)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const bookUid = url.searchParams.get('bookUid');

    const query: Record<string, unknown> = {};
    if (currentUser?.uid) {
      query.authorUid = currentUser.uid;
    }
    if (bookUid) {
      query.bookUid = bookUid;
    }

    const annotations = await AnnotationModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: annotations }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture des notes.");
  }
});

// ==========================================
// POST : Sceller une nouvelle Annotation / Note de marge (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = CreateAnnotationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données incomplètes ou invalides : ${errorMessage}` }, { status: 400 });
    }

    const { bookUid, bookTitle, selectedText, comment, importance, chapterReference } = validationResult.data;

    const annotationUid = `annot_${randomUUID()}`;
    const newAnnotation = await AnnotationModel.create({
      uid: annotationUid,
      bookUid,
      bookTitle,
      authorUid: currentUser.uid,
      selectedText,
      comment,
      importance,
      chapterReference: chapterReference || null,
    });

    revalidateTag('bibliotek-annotations');
    revalidateTag(`bibliotek-annotations-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: "Note consignée dans le Codex avec succès.",
      data: newAnnotation,
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du scellage de la note.");
  }
});