export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🕊️ PUT : Appliquer une fluctuation à l'Oiseau (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Flux de mutation illisible." }, { status: 400 });
    }

    const userUid = currentUser.uid || currentUser.id;
    const { frequenceHEX, sanctuaire, variationEntropie } = body;

    const oiseau = await OiseauModel.findOne({ uid: userUid });
    if (!oiseau) {
      return NextResponse.json({ message: "Fréquence introuvable." }, { status: 404 });
    }

    if (oiseau.sanctuaireVerrouille) {
      return NextResponse.json({ 
        message: "Votre sanctuaire est verrouillé. Le silence est de mise." 
      }, { status: 403 });
    }

    if (sanctuaire) {
      oiseau.sanctuaire = { ...oiseau.sanctuaire, ...sanctuaire };
    }

    const oiseauOrch = new OiseauOrchestrator();
    const resultat = await oiseauOrch.appliquerFluctuation(
      oiseau, 
      frequenceHEX, 
      variationEntropie 
    );

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('oiseaux');
    revalidateTag(`oiseau-${userUid}`);

    return NextResponse.json({
      message: "La structure a muté.",
      etat: resultat
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur de fluctuation :", error);
    return NextResponse.json({ message: "La magie s'est dissipée avant d'agir." }, { status: 500 });
  }
});