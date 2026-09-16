export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedPartitas } from '@/lib/cache/partita.cache';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA DE VALIDATION ZOD (Anti Mass Assignment)
// ==========================================
const CreatePartitaSchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  content: z.string().min(1, "Le contenu de la partition est requis."),
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
// GET : Le Catalogue des Partitions (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const filterInstrument = url.searchParams.get('instrument');
    const filterStatus = url.searchParams.get('status');
    const userUid = currentUser?.uid;
    const partitions = await getCachedPartitas(userUid, filterInstrument, filterStatus);
    const safePartitions = JSON.parse(JSON.stringify(partitions || []));
    return NextResponse.json(safePartitions, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur globale GET Partitions:", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});

// ==========================================
// POST : Fondation d'une Partition avec Sceau SHA-256 (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // Validation stricte par Zod (Anti Mass Assignment)
    const validationResult = CreatePartitaSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ error: `Données de partition invalides : ${errorMessage}` }, { status: 400 });
    }

    const validatedData = validationResult.data;

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité de la composition musicale
    const canonicalContent = JSON.stringify({
      title: validatedData.title,
      content: validatedData.content,
      instrument: validatedData.instrument || 'general',
      authorUid: currentUser.uid
    });

    const contentBuffer = Buffer.from(canonicalContent, 'utf-8');
    const digitalSignature = generateFileHash(contentBuffer);
    const timestampedAt = new Date();

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    let result: any;
    try {
      const partitaOrch = new PartitaOrchestrator();
      const dataToForge = { 
        ...validatedData, 
        authorUid: currentUser.uid,
        digitalSignature,
        timestampedAt,
        copyrightClaimed: true
      };
      result = await partitaOrch.fosterPartita(dataToForge, signature);
    } catch (orchErr: any) {
      console.error("  [PARTITA ORCHESTRATOR POST ERROR] :", orchErr);
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'îlot repousse cette partition." }, { status });
    }
          
    revalidateTag('partitas');
    revalidateTag(`partitas-user-${currentUser.uid}`);
    revalidateTag(`partitas-user-public`);

    const finalResponse = {
      success: result.success,
      status: result.status,
      uid: result.mongo?.uid,
      title: result.mongo?.title,
      mongo: result.mongo,
      digitalSignature,
      timestampedAt
    };

    return NextResponse.json(finalResponse, { status: 201 });
  } catch (error: any) {
    console.error("  Erreur globale POST Partitions :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});