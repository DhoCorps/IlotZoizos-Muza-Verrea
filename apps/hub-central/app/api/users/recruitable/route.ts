import { NextResponse } from 'next/server';
import { connectToDatabase, OiseauModel } from "@ilot/infrastructure"; 
import { OiseauOrchestrator } from "@ilot/shared-core"; 
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, withSilice, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Nos boucliers stricts

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// 🧠 LA FONCTION MÉMOÏSÉE (La Volière Publique)
// -------------------------------------------------------------------------
const getCachedOiseaux = unstable_cache(
  async (searchPhrase: string | null) => {
    await connectToDatabase(); 

    let query: Record<string, any> = {};
    if (searchPhrase) {
      query.$or = [
        { slug: { $regex: searchPhrase, $options: 'i' } },
        { pseudo: { $regex: searchPhrase, $options: 'i' } },
        { capabilities: { $regex: searchPhrase, $options: 'i' } } 
      ];
    }

    return await OiseauModel.find(query)
      .select('uid slug pseudo frequenceHEX capabilities signature')
      .sort({ createdAt: -1 })
      .limit(20) 
      .lean();
  },
  ['public-users-query'],
  { 
    revalidate: 120, 
    tags: ['users', 'voliere'] 
  }
);

// -------------------------------------------------------------------------
// 🔍 GET : Recensement des Oiseaux (Volière Publique)
// -------------------------------------------------------------------------
// 🛡️ withAura : Exige une authentification valide
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    // ⚡ Appel au cache
    const users = await getCachedOiseaux(search);

    return NextResponse.json(users, { status: 200 });

  } catch (error) {
    console.error("🔥 Erreur lors du recensement des oiseaux :", error);
    return NextResponse.json({ error: "Le Nexus n'a pas pu lister les oiseaux." }, { status: 500 });
  }
});

// -------------------------------------------------------------------------
// 🐣 POST : Éclosion d'un Oiseau (Inscription)
// -------------------------------------------------------------------------
// 🛡️ withSilice : Route publique (veille uniquement sur la Silice)
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "L'œuf est muet : Corps de requête invalide" }, { status: 400 });
    }

    if (!body.email || !body.pseudo || !body.password) {
      return NextResponse.json(
        { error: "L'œuf est incomplet (Email, Pseudo et Mot de passe requis)." }, 
        { status: 400 }
      );
    }

    const existingUser = await OiseauModel.findOne({ 
      $or: [{ email: body.email }, { pseudo: body.pseudo }] 
    }).lean();

    if (existingUser) {
      return NextResponse.json(
        { error: "Cet oiseau chante déjà dans une autre cage." }, 
        { status: 409 }
      );
    }

    let syncResult;
    try {
      const orchestrator = new OiseauOrchestrator();
      syncResult = await orchestrator.fosterOiseau({
        email: body.email,
        pseudo: body.pseudo,
        password: body.password, 
        frequenceHEX: body.frequenceHEX || '#8b9dc3' // Le gris bleuté pour des raisons écologiques !
      });
    } catch (orchErr: any) {
      const status = orchErr.statusCode || orchErr.status || 500;
      return NextResponse.json({ error: orchErr.message || "L'œuf a été brisé lors de l'éclosion." }, { status });
    }

    const nouvelOiseau = syncResult.mongo || syncResult;

    // 💥 BOOM ! Invalidation de cache de la Volière
    revalidateTag('users');

    return NextResponse.json({
      success: true,
      message: "L'oiseau a éclos dans le Nexus et dans le Graphe !",
      uid: nouvelOiseau.uid,
      slug: nouvelOiseau.slug
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur d'éclosion :", error);
    return NextResponse.json({ error: "L'œuf a été brisé lors de l'éclosion." }, { status: 500 });
  }
});