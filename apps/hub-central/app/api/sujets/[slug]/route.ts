export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { SujetModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { SujetOrchestrator, UpdateSujetPayload } from '@ilot/shared-core'; 
import { ActionSignature, ISujet } from '@ilot/types'; // 🟢 CORRECTION : Ajout de l'import ISujet
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSujetDetails } from '@/lib/cache/sujets.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod strict
const UpdateSujetSchema = z.object({
  title: z.string().min(1, "Le titre est requis.").optional(),
  content: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  category: z.enum(["MONOLOGUE", "POETRY", "TUTORIAL", "LORE", "MANIFESTO"]).optional(),
  tags: z.array(z.string()).optional(),
  media: z.object({
    coverImageUrl: z.string().url("URL de couverture invalide.").optional(),
    audioTrackUrl: z.string().url("URL audio invalide.").optional(),
  }).nullable().optional(),
  // 🚀 Injection de la validation du Copyright DRY
  copyrightMetadata: z.object({
    role: z.enum(['CREATOR', 'SUBLIMATOR', 'CURATOR']),
    originalAuthor: z.string().optional(),
    originalWorkTitle: z.string().optional(),
    sublimationNotes: z.string().optional(),
    isExclusiveIlot: z.boolean().optional()
  }).optional(),
}).passthrough();

// ==========================================
// GET : Ausculter un sujet spécifique
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 🟢 CORRECTION : Remplacement du "any" par "ISujet | null" avec assertion de type
    let sujet: ISujet | null = (await getCachedSujetDetails(identifier)) as ISujet | null;
    if (!sujet) {
      sujet = (await findEntityBySlugOrUid(SujetModel, identifier)) as ISujet | null;
    }

    if (!sujet) {
      return NextResponse.json({ error: "Ce monologue s'est évaporé dans la brume." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isPublic = sujet.status === 'PUBLISHED';
    const isMine = sujet.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Ce monologue intime t'est fermé." }, { status: 403 });
    }

    const response = NextResponse.json(sujet, { status: 200 });

    // ✨ OPTIMISATION PERF/SEO : Mise en cache CDN (Edge) pour les visiteurs publics
    if (isPublic && !isMine && !isArchitect) {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    }

    return response;
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET GET ERROR");
  }
});

// ==========================================
// PUT : Mutation du Sujet (Déléguée à l'Orchestrator)
// ==========================================
export const PUT = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement stricts via Zod
    const validation = UpdateSujetSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de mutation invalides.", details: validation.error.flatten() }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result;
    try {
      // 🔄 Délégation de la mise à jour au SujetOrchestrator
      const sujetOrch = new SujetOrchestrator();
      
      result = await sujetOrch.updateSujet(identifier, validation.data as UpdateSujetPayload, signature);
      
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ error: err.message || "Échec de la mutation du sujet dans le Nexus." }, { status });
    }
          
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);
    if (result.mongo?.uid) revalidateTag(`sujet-${result.mongo.uid}`);
    if (result.mongo?.slug) revalidateTag(`sujet-${result.mongo.slug}`);

    return NextResponse.json({ success: true, data: result.mongo }, { status: 200 });
  } catch (error: unknown) {
    console.error("💥 ERREUR EXACTE DANS PUT :", error);
    return handleRouteError(error, "SUJET PUT ERROR");
  }
});

// ==========================================
// DELETE : Désintégration / Suppression du Sujet
// ==========================================
export const DELETE = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      // 🔄 Délégation totale : l'Orchestrateur vérifie l'existence, les droits, purge S3/R2 et Neo4j/Mongo.
      const sujetOrch = new SujetOrchestrator();
      await sujetOrch.disintegrateSujet(identifier, signature);
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.status || err.statusCode || 500;
      return NextResponse.json({ error: err.message || "Erreur lors de la désintégration." }, { status });
    }
          
    revalidateTag('sujets');
    revalidateTag(`sujet-${identifier}`);

    return NextResponse.json({
       success: true,
       message: "Le monologue a été réduit en cendres. Les liens dans le Graphe sont rompus."
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "SUJET DELETE ERROR");
  }
});