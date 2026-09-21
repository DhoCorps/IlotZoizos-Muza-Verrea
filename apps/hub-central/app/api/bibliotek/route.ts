export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator, BibliotekSyncResult } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment & Statut de Publication)
// ==========================================
const CreateBookSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  fileUrl: z.string().min(1, "La source du fichier est requise."),
  writingType: z.string().optional(),
  style: z.string().optional(),
  slug: z.string().optional(),
  coverUrl: z.string().optional().nullable(),
  format: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(), // 🟢 Ajout du statut
  economy: z.object({
    priceCents: z.number().int().nonnegative().optional(),
    currency: z.string().optional(),
    barterAllowed: z.boolean().optional(),
    gachaTier: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']).optional(),
    isTradable: z.boolean().optional(),
    rights: z.object({
      allowCommercial: z.boolean().optional(),
      allowBarter: z.boolean().optional(),
      allowLending: z.boolean().optional(),
      transferable: z.boolean().optional(),
    }).optional(),
  }).optional(),
  settings: z.object({
    allowReadExchange: z.boolean().optional().default(true),
    consentForShowcase: z.boolean().optional()
  }).optional()
});

// ==========================================
// GET : Le Sanctuaire des Écrits Libres (Public / Optionnel Aura avec Pagination)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const filterType = url.searchParams.get('writingType');
    const filterStyle = url.searchParams.get('style');
    const authorUid = url.searchParams.get('authorUid');
    const status = url.searchParams.get('status');

    // 📄 Paramètres de pagination performante
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (filterType && filterType !== 'ALL') query.writingType = filterType;
    if (filterStyle && filterStyle !== 'ALL') query.style = filterStyle;
    if (authorUid) query.authorUid = authorUid;

    // 🔒 LOGIQUE DE VISIBILITÉ : Studio de l'auteur vs Vitrine publique
    const isRequestingOwnStudio = currentUser && currentUser.uid === authorUid;
    
    if (isRequestingOwnStudio) {
      // L'auteur peut filtrer ses brouillons ou archives depuis son Studio
      if (status && status !== 'ALL') {
        query.status = status;
      }
    } else {
      // 🛡️ Garde-Fou : Le public ne voit QUE les œuvres validées/publiées
      query.status = 'PUBLISHED';
    }

    // 🚀 Requêtes optimisées avec curseurs de pagination et comptage total
    const [books, total] = await Promise.all([
      LibraryBookModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      LibraryBookModel.countDocuments(query)
    ]);

    const safeBooks = JSON.parse(JSON.stringify(books || []));

    return NextResponse.json({ 
      success: true, 
      data: safeBooks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du sanctuaire.");
  }
});

// ==========================================
// POST : Fonder un Ouvrage avec Sceau SHA-256 (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    const validationResult = CreateBookSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Données d'ouvrage invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData = validationResult.data;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: BibliotekSyncResult;
    try {
      const bibliotekOrch = new BibliotekOrchestrator();
      const dataToForge = { 
        ...validatedData, 
        authorUid: currentUser.uid,
        authorSlug: currentUser.slug || currentUser.uid
      };
      result = await bibliotekOrch.fosterBook(dataToForge, signature);
    } catch (orchErr: unknown) {
      console.error("🔥 [BIBLIOTEK ORCHESTRATOR POST ERROR] :", orchErr);
      const errObj = orchErr as { statusCode?: number; status?: number; message?: string };
      const status = errObj.statusCode || errObj.status || 500;
      return NextResponse.json({ success: false, error: errObj.message || "L'Îlot repousse cet ouvrage." }, { status });
    }

    revalidateTag('bibliotek');
    revalidateTag(`bibliotek-user-${currentUser.uid}`);
    revalidateTag('bibliotek-public');

    return NextResponse.json({
      success: true,
      message: "Ouvrage sédimenté et scellé par SHA-256 dans le Sanctuaire.",
      data: result.mongo,
      digitalSignature: result.mongo.digitalSignature,
      timestampedAt: result.mongo.timestampedAt
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du serveur.");
  }
});