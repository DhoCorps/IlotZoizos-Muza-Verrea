export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversalAnnotationModel } from '@ilot/infrastructure';
import { AnnotationOrchestrator } from '@ilot/shared-core';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { ActionSignature, AnnotationTargetType } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

// 🛡️ Schéma Zod pour valider la création d'annotation universelle
const CreateAnnotationSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible (targetUid) est requis."),
  targetType: z.enum(['BOOK', 'ARTICLE', 'COMMENT']),
  targetTitle: z.string().optional(),
  selectedText: z.string().min(1, "Le texte surligné (selectedText) est requis."),
  comment: z.string().optional().default(''),
  importance: z.number().int().min(1).max(5).optional().default(1),
  emotion: z.string().optional(),
  chapterReference: z.string().optional().nullable(),
});

// ==========================================
// GET : Lister les annotations (Filtrables par targetUid ou authorUid)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const targetUid = url.searchParams.get('targetUid');
    const targetType = url.searchParams.get('targetType');
    const authorUid = url.searchParams.get('authorUid');

    const query: Record<string, unknown> = {};
    if (targetUid) query.targetUid = targetUid;
    if (targetType) query.targetType = targetType;
    if (authorUid) query.authorUid = authorUid;

    // Si aucun filtre spécifique n'est posé, on restreint aux notes de l'utilisateur connecté par défaut si présent, sinon public
    const annotations = await UniversalAnnotationModel.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: annotations }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la récupération des notes.");
  }
});

// ==========================================
// POST : Sceller une nouvelle annotation universelle (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
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

    const payload = validationResult.data;
    const signature: ActionSignature = { actorUid: currentUser.uid, capabilities: currentUser.capabilities || [] };

    // 🌟 Passage par l'AnnotationOrchestrator unifié (Double écriture Mongo + Neo4j + Notification)
    let result;
    try {
      const orchestrator = new AnnotationOrchestrator();
      result = await orchestrator.fosterAnnotation({
        targetUid: payload.targetUid,
        targetType: payload.targetType as AnnotationTargetType,
        targetTitle: payload.targetTitle,
        selectedText: payload.selectedText,
        comment: payload.comment,
        importance: payload.importance,
        emotion: payload.emotion,
        chapterReference: payload.chapterReference,
      }, signature);
    } catch (orchErr: unknown) {
      const errObj = orchErr as { statusCode?: number; status?: number; message?: string };
      const status = errObj.statusCode || errObj.status || 500;
      return NextResponse.json({ success: false, error: errObj.message || "La matrice rejette cette résonance." }, { status });
    }

    revalidateTag('annotations');
    revalidateTag(`annotations-${payload.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "Note consignée et résonance tissée avec succès.",
      data: result.mongo,
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la consignation de la note.");
  }
});