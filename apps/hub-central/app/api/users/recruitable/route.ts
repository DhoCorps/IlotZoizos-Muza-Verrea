export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel } from "@ilot/infrastructure";
import { OiseauOrchestrator, OiseauSyncResult } from "@ilot/shared-core";
import { revalidateTag } from 'next/cache';
import { withAura, withSilice, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedOiseaux } from '@/lib/cache/users.cache';

// -------------------------------------------------------------------------
// GET : Recensement des Oiseaux (Volière Publique)
// -------------------------------------------------------------------------
export const GET = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const search = url.searchParams.get('search');
    
    // Appel direct au cache centralisé
    const users = await getCachedOiseaux(search);
    
    return NextResponse.json(users, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "USERS RECRUITABLE GET FATAL ERROR");
  }
});

// -------------------------------------------------------------------------
// POST : Éclosion d'un Oiseau (Inscription)
// -------------------------------------------------------------------------
export const POST = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let body: { email?: string; pseudo?: string; password?: string; frequenceHEX?: string; [key: string]: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'oeuf est muet : Corps de requête invalide" }, { status: 400 });
    }

    if (!body?.email || !body?.pseudo || !body?.password) {
      return NextResponse.json(
        { success: false, error: "L'oeuf est incomplet (Email, Pseudo et Mot de passe requis)." },
        { status: 400 }
      );
    }

    const existingUser = await OiseauModel.findOne({
      $or: [{ email: body.email }, { pseudo: body.pseudo }]
    }).lean();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Cet oiseau chante déjà dans une autre cage." },
        { status: 409 }
      );
    }

    let syncResult: OiseauSyncResult;
    try {
      const orchestrator = new OiseauOrchestrator();
      syncResult = await orchestrator.fosterOiseau({
        email: body.email,
        pseudo: body.pseudo,
        password: body.password,
        frequenceHEX: body.frequenceHEX || '#2D3748'
      });
    } catch (orchErr: unknown) {
      const err = orchErr as { status?: number; statusCode?: number; message?: string };
      const status = err.statusCode || err.status || 500;
      return NextResponse.json({ success: false, error: err.message || "L'oeuf a été brisé lors de l'éclosion." }, { status });
    }

    const nouvelOiseau = (syncResult.mongo as { uid?: string; slug?: string }) || (syncResult as { uid?: string; slug?: string });

    // BOOM ! Invalidation de cache de la Volière
    revalidateTag('users');

    return NextResponse.json({
      success: true,
      message: "L'oiseau a éclos dans le Nexus et dans le Graphe !",
      uid: nouvelOiseau.uid,
      slug: nouvelOiseau.slug
    }, { status: 201 });
  } catch (error: unknown) {
    return handleRouteError(error, "USERS RECRUITABLE POST FATAL ERROR");
  }
});