// Fichier : app/api/partita/[slug]/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { ActionSignature, CAPABILITIES } from '@ilot/types';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedPartitaDetails } from '@/lib/cache/partita.cache';

// ==========================================
// GET : Consulter une Partition spécifique (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
    } catch (err) {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const partition = await getCachedPartitaDetails(slug);
    if (!partition) {
      return NextResponse.json({ error: "Cette partition s'est évaporée de la Silice." }, { status: 404 });
    }
    const userUid = currentUser?.uid;
    const sessionCaps = currentUser?.capabilities || [];
    const isPublic = (partition as any).status === 'PUBLISHED';
    const isMine = (partition as any).authorUid === userUid;
    const isArchitect = sessionCaps.includes('*');
    if (!isPublic && !isMine && !isArchitect) {
      return NextResponse.json({ error: "Cette partition intime t'est fermée." }, { status: 403 });
    }
    const myCaps = (isMine || isArchitect) ? [CAPABILITIES.SYSTEM.ALL] : [];
    return NextResponse.json({ ...partition, myCapabilities: myCaps }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Partita Slug :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// PUT : Muter une Partition (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    let body;
    try {
      resolvedParams = await context.params;
      body = await req.json();
    } catch (err) {
      return NextResponse.json({ error: "Corps de requête ou paramètres illisibles." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    let updatedPartition;
    try {
      const partitaOrch = new PartitaOrchestrator();
      updatedPartition = await partitaOrch.updatePartita(slug, body, signature);
    } catch (orchErr: any) {
      console.error("  [PARTITA ORCHESTRATOR PUT ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de mutation." }, { status });
    }
         
    revalidateTag('partitas');
    revalidateTag(`partita-${slug}`);
    if (updatedPartition?.uid) {
      revalidateTag(`partita-${updatedPartition.uid}`);
    }
    return NextResponse.json(updatedPartition, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale PUT Partita :", error);
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
      resolvedParams = await context.params;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
    }
    const rawSlug = resolvedParams?.slug;
    const slug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');
    if (!slug) {
      return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    }
    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };
    try {
      const partitaOrch = new PartitaOrchestrator();
      await partitaOrch.disintegratePartita(slug, signature);
    } catch (orchErr: any) {
      console.error("  [PARTITA ORCHESTRATOR DELETE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "Échec de dissolution." }, { status });
    }
         
    revalidateTag('partitas');
    revalidateTag(`partita-${slug}`);
    return NextResponse.json({ message: "La partition a été réduite en cendres." }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale DELETE Partita :", error);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
});