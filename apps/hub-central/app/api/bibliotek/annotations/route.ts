export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { AnnotationModel } from '@ilot/infrastructure';
import { UniversalCommentOrchestrator } from '@ilot/shared-core'; // 🌟 Import de l'Orchestrateur Universel
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { ActionSignature } from '@ilot/types';
import { randomUUID } from 'crypto';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

const CreateAnnotationSchema = z.object({
  bookUid: z.string().min(1, "L'UID du livre est requis."),
  bookTitle: z.string().min(1, "Le titre du livre est requis."),
  selectedText: z.string().min(1, "Le texte sélectionné est requis."),
  comment: z.string().optional().default(''),
  importance: z.number().int().min(1).max(5).optional().default(1),
  chapterReference: z.string().optional().nullable(),
});

// ==========================================
// GET : Lister les Annotations de l'Oiseau (Avec Pagination)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try { url = new URL(req.url); } catch { return NextResponse.json({ success: false, error: "URL invalide." }, { status: 400 }); }

    const bookUid = url.searchParams.get('bookUid');

    // 📄 Paramètres de pagination performante
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    
    if (currentUser?.uid) query.authorUid = currentUser.uid;
    if (bookUid) query.bookUid = bookUid;

    // 🚀 Requêtes optimisées en parallèle avec skip, limit et comptage total
    const [annotations, total] = await Promise.all([
      AnnotationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AnnotationModel.countDocuments(query)
    ]);

    return NextResponse.json({ 
      success: true, 
      data: annotations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture des notes.");
  }
});

// ==========================================
// POST : Sceller une nouvelle Annotation (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try { rawBody = await req.json(); } catch { return NextResponse.json({ success: false, error: "Corps illisible." }, { status: 400 }); }

    const validationResult = CreateAnnotationSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données invalides : ${errorMessage}` }, { status: 400 });
    }

    const { bookUid, bookTitle, selectedText, comment, importance, chapterReference } = validationResult.data;
    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };

    // 🌟 1. PASSAGE PAR L'ORCHESTRATEUR UNIVERSEL (Graphe Neo4j, Validation d'Amour, Gacha)
    try {
      const orchestrator = new UniversalCommentOrchestrator();
      
      // On formate magnifiquement la citation en Markdown pour l'écho public
      const formattedContent = `> ${selectedText}\n\n${comment || '*Fulgurance silencieuse consignée dans le Codex.*'}`;
      
      await orchestrator.fosterComment({
        targetUid: bookUid,
        targetType: 'BOOK' as any, // Cast pour matcher CommentTargetType
        content: formattedContent
      }, signature);
    } catch (orchErr: unknown) {
      // 🚨 Si l'Oiseau n'a pas "aimé" l'ouvrage (REACTED_TO), l'orchestrateur le bloquera ici !
      console.error("  [UNIVERSAL COMMENT REJECTED] :", orchErr);
      const errObj = orchErr as { statusCode?: number; status?: number; message?: string };
      const status = errObj.statusCode || errObj.status || 500;
      return NextResponse.json({ success: false, error: errObj.message || "La matrice rejette cette résonance." }, { status });
    }

    // 📖 2. CONSIGNATION STRUCTURÉE DANS LA SILICE (Pour l'interface du Codex)
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
      message: "Note consignée dans le Codex et résonance tissée avec succès.",
      data: newAnnotation,
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du scellage de la note.");
  }
});