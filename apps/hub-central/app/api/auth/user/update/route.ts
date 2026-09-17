export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// 🛡️ Payload typé pour la mutation de l'oiseau
interface UpdateOiseauBody {
  frequenceHEX?: string;
  sanctuaire?: Record<string, unknown>;
  variationEntropie?: number;
}

// ==========================================
// 🕊️ PUT : Appliquer une fluctuation à l'Oiseau (Strictement Privé / Aura)
// ==========================================
export const PUT = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = (await req.json().catch(() => null)) as UpdateOiseauBody | null;
    if (!body) {
      return NextResponse.json({ success: false, message: "Flux de mutation illisible." }, { status: 400 });
    }

    const userUid = currentUser.uid || currentUser.id;
    const { frequenceHEX, sanctuaire, variationEntropie } = body;

    const oiseau = await OiseauModel.findOne({ uid: userUid });
    if (!oiseau) {
      return NextResponse.json({ success: false, message: "Fréquence introuvable." }, { status: 404 });
    }

    if (oiseau.sanctuaireVerrouille) {
      return NextResponse.json({ 
        success: false,
        message: "Votre sanctuaire est verrouillé. Le silence est de mise." 
      }, { status: 403 });
    }

    if (sanctuaire) {
      oiseau.sanctuaire = { ...(oiseau.sanctuaire || {}), ...sanctuaire };
    }

    const oiseauOrch = new OiseauOrchestrator();
    // 🛡️ On passe l'identifiant (ou l'objet selon la signature attendue)
    const resultat = await oiseauOrch.appliquerFluctuation(
      userUid, 
      variationEntropie ?? 0, 
      { actorUid: userUid, capabilities: currentUser.capabilities },
      frequenceHEX 
    );

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('oiseaux');
    revalidateTag(`oiseau-${userUid}`);

    return NextResponse.json({
      success: true,
      message: "La structure a muté.",
      etat: resultat
    }, { status: 200 });

  } catch (error: unknown) {
    // 🛡️ Utilisation du gestionnaire d'erreur global (zéro 'any')
    return handleRouteError(error, "La magie s'est dissipée avant d'agir.");
  }
});