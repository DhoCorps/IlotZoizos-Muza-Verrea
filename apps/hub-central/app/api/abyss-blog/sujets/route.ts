export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SujetOrchestrator, FosterSujetPayload } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSujets } from '@/lib/cache/sujets.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod musclé pour la fondation d'un Sujet
const FosterSujetSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  content: z.string().min(1, "Le contenu est requis."),
  slug: z.string().optional(),
  
  // Validation stricte des enums pour s'aligner avec le typage ISujet
  category: z.enum(["MONOLOGUE", "POETRY", "TUTORIAL", "LORE", "MANIFESTO"]).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  
  tags: z.array(z.string()).optional(),
  
  // Validation stricte des objets imbriqués
  media: z.object({
    coverImageUrl: z.string().url("URL de couverture invalide.").optional(),
    audioTrackUrl: z.string().url("URL audio invalide.").optional(),
  }).optional(),
  
  connections: z.object({
    relatedProjects: z.array(z.string()).optional(),
    relatedTasks: z.array(z.string()).optional(),
    relatedProducts: z.array(z.string()).optional(),
    relatedGames: z.array(z.string()).optional(),
    crossLinks: z.array(z.object({
      entityId: z.string(),
      entityType: z.string(),
      label: z.string().optional()
    })).optional()
  }).optional(),
  
  settings: z.object({
    allowComments: z.boolean().optional(),
    allowEmojiReactions: z.boolean().optional(),
    allowPropagation: z.boolean().optional(),
    isAgeRestricted: z.boolean().optional(),
    alchemicalTransmuted: z.boolean().optional(),
  }).optional(),
  
  merchLink: z.object({
    productId: z.string().optional(),
    priceCents: z.number().int().optional(),
  }).optional()
}).passthrough();

// ==========================================
// GET : La Bibliothèque (Lister les sujets)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const filterCategory = url.searchParams.get('category') || undefined;
    const userUid = currentUser?.uid;
    const sujets = await getCachedSujets(userUid, filterCategory);
    return NextResponse.json(sujets, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "BIBLIOTHEQUE GET ERROR");
  }
});

// ==========================================
// POST : Fondation d'un Nœud de Pensée (Strictement Privé)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 1. Validation Zod en amont
    const validation = FosterSujetSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de sédimentation invalides.", details: validation.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      // 2. Délégation totale à l'Orchestrator pour la double écriture atomique
      const sujetOrch = new SujetOrchestrator();
      
      // Affirmation de type explicite pour apaiser TypeScript
      const dataToForge = { 
        ...validation.data, 
        authorUid: currentUser.uid 
      } as FosterSujetPayload;
      
      result = await sujetOrch.fosterSujet(dataToForge, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      console.error("  [NEXUS SUJET ORCHESTRATOR ERROR] :", err);
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "L'îlot repousse ce fragment de pensée." }, { status });
    }
         
    // 3. Invalidation rigoureuse du cache en cascade
    revalidateTag('sujets');
    revalidateTag(`sujets-user-${currentUser.uid}`);
    revalidateTag(`sujets-user-public`);
    
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET POST ERROR");
  }
});