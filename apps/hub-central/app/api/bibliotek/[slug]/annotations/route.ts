export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { AnnotationModel, LibraryBookModel, findEntityBySlugOrUid, ILibraryBook } from '@ilot/infrastructure';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { slugify } from '@/lib/slugify';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

// 🛡️ Schéma Zod pour valider la création d'annotation
const CreateAnnotationSchema = z.object({
  selectedText: z.string().min(1, "Le texte surligné (selectedText) est requis."),
  comment: z.string().optional().default(''),
  importance: z.number().int().min(1).max(5).optional().default(1),
  chapterReference: z.string().optional().nullable(),
});

// ==========================================
// GET : Lister les annotations d'un ouvrage spécifique
// ==========================================
export const GET = withOptionalAura(async (_req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 🔍 Utilisation de notre helper unifié (Slug ou UID)
    const book = await findEntityBySlugOrUid(LibraryBookModel, identifier) as ILibraryBook | null;
    if (!book) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable." }, { status: 404 });
    }

    const query: Record<string, unknown> = { bookUid: book.uid };
    if (currentUser?.uid) {
      query.authorUid = currentUser.uid;
    }

    const annotations = await AnnotationModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: annotations }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la récupération des notes.");
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
    const book = await findEntityBySlugOrUid(LibraryBookModel, identifier) as ILibraryBook | null;
    if (!book) {
      return NextResponse.json({ success: false, error: "Ouvrage introuvable." }, { status: 404 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte Zod
    const validationResult = CreateAnnotationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données invalides : ${errorMessage}` }, { status: 400 });
    }

    const { selectedText, comment, importance, chapterReference } = validationResult.data;

    const annotationUid = `annot_${randomUUID()}`;
    const newAnnotation = await AnnotationModel.create({
      uid: annotationUid,
      bookUid: book.uid,
      bookTitle: book.title,
      authorUid: currentUser.uid,
      selectedText,
      comment,
      importance,
      chapterReference: chapterReference || null,
    });

    revalidateTag('bibliotek-annotations');
    revalidateTag(`bibliotek-annotations-${book.uid}`);

    return NextResponse.json({
      success: true,
      message: "Note consignée pour cet ouvrage.",
      data: newAnnotation,
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consignation de la note.");
  }
});