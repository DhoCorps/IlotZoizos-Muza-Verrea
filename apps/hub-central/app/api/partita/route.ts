export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { PartitaOrchestrator } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, withOptionalAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedPartitas } from '@/lib/cache/partita.cache';
import { generateFileHash } from '@/lib/cryptoHelper'; // 🛡️ Sceau SHA-256 d'antériorité

// ==========================================
// GET : Le Catalogue des Partitions (Public / Optionnel Aura)
// ==========================================
export const GET = withOptionalAura(async (req: Request, _context: ApiContext, currentUser?: OiseauUser) => {
  try {
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
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
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    if (!body.title || !body.content) {
      return NextResponse.json({ error: "Une partition nécessite un titre et une substance (contenu)." }, { status: 400 });
    }

    // 🪡 Génération du Sceau Cryptographique (SHA-256) d'Antériorité de la composition musicale
    const canonicalContent = JSON.stringify({
      title: body.title,
      content: body.content,
      instrument: body.instrument || 'general',
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
        ...body, 
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

    // S'assure que le résultat renvoie bien le sceau d'antériorité
    const finalResponse = {
      ...(typeof result === 'object' && result !== null ? result : { data: result }),
      digitalSignature,
      timestampedAt
    };

    return NextResponse.json(finalResponse, { status: 201 });
  } catch (error: any) {
    console.error("  Erreur globale POST Partitions :", error);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
});