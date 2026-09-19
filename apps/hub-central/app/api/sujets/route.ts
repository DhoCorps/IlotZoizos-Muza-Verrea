export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SujetOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSujets } from '@/lib/cache/sujets.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour la fondation d'un Sujet
const FosterSujetSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  content: z.string().min(1, "Le contenu est requis."),
  slug: z.string().optional(),
  category: z.string().optional(),
  status: z.string().optional(),
  tags: z.array(z.string()).optional(),
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
      return NextResponse.json({ error: "Un Sujet nécessite un nom et une substance (contenu).", details: validation.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      // 2. Délégation totale à l'Orchestrator pour la double écriture atomique
      const sujetOrch = new SujetOrchestrator();
      const dataToForge = { ...validation.data, authorUid: currentUser.uid };
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