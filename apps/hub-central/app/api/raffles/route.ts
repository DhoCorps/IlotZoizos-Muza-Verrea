export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { RaffleOrchestrator, IlotError } from '@ilot/shared-core';
import { ActionSignature } from '@ilot/types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// SCHÉMA ZOD : Validation du contrat de loterie
// ==========================================
const CreateRaffleSchema = z.object({
  prizeProductUid: z.string().min(1, "L'identifiant du produit mis en jeu est requis."),
  ticketPriceShards: z.number().min(0, "Le prix du ticket en éclats doit être positif."),
  maxTickets: z.number().int().positive().optional(),
  drawDate: z.string().min(1, "La date de tirage est requise."),
});

// ==========================================
// POST : Création d'une Loterie (Vendeur / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const validation = CreateRaffleSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorMessage = validation.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const { prizeProductUid, ticketPriceShards, maxTickets, drawDate } = validation.data;
    const uid = `raffle_${uuidv4()}`;

    const signature: ActionSignature = {
      actorUid: currentUser.uid,
      capabilities: currentUser.capabilities || []
    };

    const orchestrator = new RaffleOrchestrator();
    const result = await orchestrator.createRaffle({
      uid,
      prizeProductUid,
      ticketPriceShards,
      maxTickets,
      drawDate: new Date(drawDate),
    }, signature);

    return NextResponse.json({
      success: true,
      message: "Loterie sédimentée avec succès dans la Canopée.",
      data: result
    }, { status: 201 });

  } catch (error: unknown) {
    if (error instanceof IlotError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    return handleRouteError(error, "Erreur interne lors de la création de la loterie.");
  }
});