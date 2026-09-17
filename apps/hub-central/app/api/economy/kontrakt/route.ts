export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KonTraKt, EconomyService, withNeo4jSession } from '@ilot/infrastructure';
import { KonTraKtCreationSchema, IKonTraKt } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// ==========================================
// GET : Lister les KonTraKts du marché (avec filtre optionnel sur les 'pending')
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'pending';
    const gameId = searchParams.get('gameId');

    const query: Record<string, unknown> = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (gameId) {
      query.gameId = gameId;
    }

    const kontrakts = await KonTraKt.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      count: kontrakts.length,
      data: kontrakts
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Impossible de récupérer les KonTraKts du marché.");
  }
});

// ==========================================
// POST : Sceller un KonTraKt de Konfiance (Multijoueur)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Uniformisation stricte sur currentUser.uid
    const userUid = currentUser.uid;
    
    // Enrichissement temporaire pour la validation Zod
    const bodyWithCreator = {
      ...(rawBody as Record<string, unknown>),
      creatorId: userUid,
      expiresAt: (rawBody as { expiresAt?: string }).expiresAt ? new Date((rawBody as { expiresAt: string }).expiresAt) : undefined
    };

    // 1. Validation Zod stricte
    const validation = KonTraKtCreationSchema.safeParse(bodyWithCreator);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: "Le contrat est malformé.", 
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const data = validation.data;

    // 2. Anti-Monopole : Vérification du quota (Max 3 contrats 'pending' simultanés)
    const activeContracts = await KonTraKt.countDocuments({ creatorId: userUid, status: 'pending' });
    if (activeContracts >= 3) {
      return NextResponse.json({ 
        success: false, 
        error: "Quota atteint. Un Oiseau ne peut émettre que 3 KonTraKts simultanément pour préserver l'équilibre du marché." 
      }, { status: 429 });
    }

    // 3. Séquestre : Déduction immédiate de la mise via EconomyService
    await EconomyService.deductResources(userUid, {
      [data.wagerCurrency]: data.wagerAmount
    });

    // 4. Cristallisation : Création du document immuable dans MongoDB
    const newKonTraKt = (await KonTraKt.create({
      ...data,
      status: 'pending'
    })) as unknown as IKonTraKt;

    // 5. Tissage Neo4j sécurisé via withNeo4jSession
    await withNeo4jSession(async (neoSession) => {
      await neoSession.run(`
        MATCH (u:User {uid: $userUid})
        MERGE (k:KonTraKt {id: $contractId})
        MERGE (u)-[r:SEALED_KONTRAKT]->(k)
        SET k.gameId = $gameId, 
            k.wagerCurrency = $currency, 
            k.targetDhOValue = $targetValue,
            r.createdAt = datetime()
      `, {
        userUid,
        contractId: (newKonTraKt._id as { toString: () => string }).toString(),
        gameId: data.gameId,
        currency: data.wagerCurrency,
        targetValue: data.targetDhOValue
      });
    });

    // 6. Invalidation chirurgicale du cache
    revalidateTag('economy');
    revalidateTag(`alveole-${userUid}`);
    revalidateTag('kontrakts');

    return NextResponse.json({
      success: true,
      message: "Le KonTraKt est scellé. Vos ressources sont placées sous séquestre.",
      data: newKonTraKt
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "La forge a échoué lors de la cristallisation.");
  }
});