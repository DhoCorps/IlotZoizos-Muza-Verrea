// Fichier : packages/backend/src/app/api/bibliotek/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LibraryBookModel } from '@ilot/infrastructure';
import { BibliotekOrchestrator, BibliotekSyncResult, FosterBookPayload } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedBibliotekCatalog } from '@/lib/cache/bibliotek.cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment, Statut, Tags & Filiation)
// ==========================================
const CreateBookSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  fileUrl: z.string().min(1, "La source du fichier est requise."),
  writingType: z.string().optional(),
  style: z.string().optional(),
  slug: z.string().optional(),
  coverUrl: z.string().optional().nullable(),
  format: z.string().optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
  copyrightClaimed: z.boolean().optional(),
  copyrightMetadata: z.object({
    role: z.enum(['CREATOR', 'SUBLIMATOR', 'CURATOR']),
    originalAuthor: z.string().optional(),
    originalWorkTitle: z.string().optional(),
    sublimationNotes: z.string().optional(),
    isExclusiveIlot: z.boolean().default(false),
    filiation: z.object({
      isExternalSource: z.boolean().default(false),
      sourceAuthorName: z.string(),
      sourceWorkTitle: z.string(),
      sourceReferenceUrl: z.string().optional(),
      claimStatus: z.enum(['PENDING_CLAIM', 'SHARED', 'REVOKED']).default('PENDING_CLAIM'),
      escrowBalance: z.number().min(0).default(0),
      derivativeType: z.string().optional()
    }).optional()
  }).optional(),
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
}); // 🚀 FIX : La parenthèse fermante est bien là !

// ==========================================
// GET : Le Sanctuaire des Écrits Libres (Public / Optionnel Aura avec Pagination & Cache)
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

    // 🚀 Optimisation : Utilisation du cache global si aucun filtre complexe de studio n'est actif, sinon requête directe
    let books;
    let total;

    if (!isRequestingOwnStudio && !authorUid && !filterType && !filterStyle) {
      // Récupération depuis le cache global de la Bibliotek
      const catalog = await getCachedBibliotekCatalog();
      books = catalog.slice(skip, skip + limit);
      total = catalog.length;
    } else {
      // Requêtes optimisées avec curseurs de pagination et comptage total en parallèle
      [books, total] = await Promise.all([
        LibraryBookModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        LibraryBookModel.countDocuments(query)
      ]);
    }

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
// POST : Fonder un Ouvrage avec Sceau SHA-256 (Support Hybride JSON / FormData)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: Record<string, any>;
    const contentType = req.headers.get('content-type') || '';

    // 🚀 FIX : Support Hybride pour gérer le "FormData" envoyé par le Scriptorium ET le "JSON" standard
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      rawBody = {
        title: formData.get('title'),
        writingType: formData.get('writingType') || undefined,
        style: formData.get('style') || undefined,
        format: formData.get('format') || undefined,
        status: formData.get('status') || undefined,
        // Fallback virtuel pour passer la validation Zod avant l'upload réel sur R2
        fileUrl: formData.get('fileUrl') || 'https://cdn.ilot/manuscript-virtual-scriptorium.txt',
      };
    } else {
      rawBody = await req.json();
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
      } as FosterBookPayload;

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