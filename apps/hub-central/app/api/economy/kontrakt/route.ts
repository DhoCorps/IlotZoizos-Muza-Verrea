export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KonTraKt, EconomyService, getNeo4jSession } from '@ilot/infrastructure';
import { KonTraKtCreationSchema } from '@ilot/types';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// GET : Lister les KonTraKts du marché (avec filtre optionnel sur les 'pending')
// ==========================================
export const GET = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'pending';
    const gameId = searchParams.get('gameId');

    // Construction du filtre de recherche
    const query: Record<string, any> = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (gameId) {
      query.gameId = gameId;
    }

    // Récupération des contrats triés par date de création (les plus récents en premier)
    const kontrakts = await KonTraKt.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      count: kontrakts.length,
      data: kontrakts
    }, { status: 200 });

  } catch (error: any) {
    console.error("  [KONTRAKT FETCH ERROR] :", error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "Impossible de récupérer les KonTraKts du marché." }, 
      { status }
    );
  }
});

// ==========================================
// POST : Sceller un KonTraKt de Konfiance (Multijoueur)
// ==========================================
export const POST = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  let neoSession;
  
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "L'onde est muette : Corps de requête illisible." }, { status: 400 });
    }

    // 🟢 LA CORRECTION EST ICI : Formatage pré-validation
    const userUid = currentUser.uid || currentUser.id;
    body.creatorId = userUid; // On injecte l'ID sécurisé pour satisfaire Zod
    
    // On convertit le string ISO du JSON en véritable objet Date
    if (body.expiresAt) {
      body.expiresAt = new Date(body.expiresAt);
    }

    // 1. Validation Zod stricte (incluant l'interdiction de parier des DhÔ en mode Solo)
    const validation = KonTraKtCreationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Le contrat est malformé.", details: validation.error.flatten() }, 
        { status: 400 }
      );
    }

    const data = validation.data;

    // 2. Anti-Monopole : Vérification du quota (Max 3 contrats 'pending' simultanés)
    const activeContracts = await KonTraKt.countDocuments({ creatorId: userUid, status: 'pending' });
    if (activeContracts >= 3) {
      return NextResponse.json(
        { error: "Quota atteint. Un Oiseau ne peut émettre que 3 KonTraKts simultanément pour préserver l'équilibre du marché." }, 
        { status: 429 }
      );
    }

    // 3. Séquestre : Déduction immédiate de la mise via ton EconomyService existant
    await EconomyService.deductResources(userUid, {
      [data.wagerCurrency]: data.wagerAmount
    });

    // 4. Cristallisation : Création du document immuable dans MongoDB
    const newKonTraKt = await KonTraKt.create({
      ...data,
      status: 'pending'
    });

    // 5. Tissage Neo4j : Traçabilité spatiale de la création du contrat
    neoSession = getNeo4jSession();
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
      contractId: newKonTraKt._id.toString(),
      gameId: data.gameId,
      currency: data.wagerCurrency,
      targetValue: data.targetDhOValue
    });

    // 6. Invalidation chirurgicale du cache (Interface Omni~TeK)
    revalidateTag('economy');
    revalidateTag(`alveole-${userUid}`);
    revalidateTag('kontrakts');

    return NextResponse.json({
      success: true,
      message: "Le KonTraKt est scellé. Vos ressources sont placées sous séquestre.",
      data: newKonTraKt
    }, { status: 201 });

  } catch (error: any) {
    console.error("  [KONTRAKT CREATE ERROR] :", error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || "La forge a échoué lors de la cristallisation." }, 
      { status }
    );
  } finally {
    // 🛡️ SUTURE ARCHITECTURALE : Fermeture garantie de la session Neo4j
    if (neoSession) {
      try {
        await neoSession.close();
      } catch (closeErr) {
        console.error("  [Neo4j] Erreur critique lors de la fermeture de la session :", closeErr);
      }
    }
  }
});