export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { PartitaModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { ActionSignature, CAPABILITIES, IPartita } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedPartitaDetails } from '@/lib/cache/partita.cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment - PUT)
// ==========================================
const UpdatePartitaSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  instrument: z.string().optional(),
  format: z.string().optional(),
  tuning: z.string().optional(),
  status: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  connections: z.object({
    relatedProjects: z.array(z.string()).optional(),
    relatedTasks: z.array(z.string()).optional(),
    relatedProducts: z.array(z.string()).optional(),
    relatedGames: z.array(z.string()).optional(),
  }).optional(),
  merchLink: z.object({
    productId: z.string(),
  }).optional().nullable(),
  media: z.object({
    coverImageUrl: z.string().url().optional().nullable(),
    audioTrackUrl: z.string().url().optional().nullable(),
  }).optional(),
  settings: z.object({
    allowComments: z.boolean().optional(),
    allowEmojiReactions: z.boolean().optional(),
  }).optional()
});

// ==========================================
// GET : Consulter une Partition spécifique (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await Promise.resolve(context.params);
    } catch (err) {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Tentative via le cache, puis repli sur le helper unifié (Slug ou UID)
    let partition: any = await getCachedPartitaDetails(identifier);
    if (!partition) {
      partition = await findEntityBySlugOrUid(PartitaModel, identifier);
    }

    if (!partition) {
      return NextResponse.json({ error: "Cette partition s'est évaporée de la Silice." }, { status: 404 });
    }

    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isPublic = partition.status === 'PUBLISHED';
    const isMine = partition.authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');

    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Cette partition intime t'est fermée." }, { status: 403 });
    }

    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];
    return NextResponse.json({ ...partition, myCapabilities: myCaps }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale GET Partita Slug :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// PUT : Muter une Partition (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let rawBody;
    try {
      resolvedParams = await Promise.resolve(context.params);
      rawBody = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Corps de requête ou paramètres illisibles." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // Validation stricte par Zod (Anti Mass Assignment)
    const validationResult = UpdatePartitaSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Données de mutation invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedUpdates = validationResult.data;

    // 🔍 Résolution unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetPartition: any = await findEntityBySlugOrUid(PartitaModel, identifier, { lean: false });
    if (!targetPartition) {
      return NextResponse.json({ error: "Partition introuvable pour mutation." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let updatedPartition;
    try {
      const partitaOrch = new PartitaOrchestrator();
      updatedPartition = await partitaOrch.updatePartita(targetPartition.uid, validatedUpdates, signature);
    } catch (orchErr: any) {
      console.error("🔥 [PARTITA ORCHESTRATOR PUT ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de mutation." }, { status });
    }
         
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('partitas');
    revalidateTag(`partita-${identifier}`);
    
    // 🛡️ TYPAGE STRICT : On extrait le document métier proprement
    const documentStructure = ('mongo' in updatedPartition ? updatedPartition.mongo : updatedPartition) as Partial<IPartita>;

    if (documentStructure?.uid) {
      revalidateTag(`partita-${documentStructure.uid}`);
    }
    if (documentStructure?.slug) {
      revalidateTag(`partita-${documentStructure.slug}`);
    }
    
    return NextResponse.json(updatedPartition, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale PUT Partita :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// DELETE : Dissoudre/Désintégrer une Partition (Strictement Privé / Aura)
// ==========================================
export const DELETE = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await Promise.resolve(context.params);
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    
    if (!identifier) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 Résolution unifiée pour s'assurer de l'existence et obtenir l'UID canonique
    const targetPartition: any = await findEntityBySlugOrUid(PartitaModel, identifier);
    if (!targetPartition) {
      return NextResponse.json({ error: "Partition introuvable pour dissolution." }, { status: 404 });
    }

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    try {
      const partitaOrch = new PartitaOrchestrator();
      // On passe l'UID strict à l'orchestrateur au lieu du slug brut
      await partitaOrch.disintegratePartita(targetPartition.uid, signature);
    } catch (orchErr: any) {
      console.error("🔥 [PARTITA ORCHESTRATOR DELETE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de dissolution." }, { status });
    }
         
    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('partitas');
    revalidateTag(`partita-${identifier}`);
    revalidateTag(`partita-${targetPartition.uid}`);
    if (targetPartition.slug) {
      revalidateTag(`partita-${targetPartition.slug}`);
    }

    return NextResponse.json({ message: "La partition a été réduite en cendres." }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale DELETE Partita :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
});