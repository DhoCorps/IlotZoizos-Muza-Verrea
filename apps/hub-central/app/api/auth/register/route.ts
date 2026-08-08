export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withSilice, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🕊️ POST : Accueillir un nouvel Oiseau (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Flux d'inscription illisible." }, { status: 400 });
    }

    const { email, password, pseudo, frequenceHEX } = body;

    if (!email || !password || !pseudo) {
      return NextResponse.json(
        { message: "L'onde est incomplète (Email, Pseudo et Mot de passe requis)." }, 
        { status: 400 }
      );
    }

    const oiseauOrch = new OiseauOrchestrator();

    // 🚀 Création de l'Oiseau via l'orchestrateur
    const syncResult = await oiseauOrch.fosterOiseau({
      email,
      password,
      pseudo,
      frequenceHEX: frequenceHEX || '#2F4F4F',
    });

    const nouvelOiseau = syncResult.mongo;

    // 💥 Invalidation chirurgicale du cache (pour rafraîchir les listes d'utilisateurs/oiseaux)
    revalidateTag('oiseaux');

    return NextResponse.json({
      message: "L'oiseau a rejoint l'Îlot !",
      oiseau: { 
        uid: nouvelOiseau.uid,
        pseudo: nouvelOiseau.pseudo, 
        frequence: nouvelOiseau.frequenceHEX 
      }
    }, { status: 201 });

  } catch (error: any) {
    const status = error.statusCode || 500;
    console.error("🔥 Caprice au seuil (Inscription) :", error.message);
    
    return NextResponse.json(
      { message: error.message || "L'Îlot repousse cette tentative." }, 
      { status }
    );
  }
});