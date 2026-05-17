// apps/hub-central/app/api/users/me/route.ts 
// (Je suppose que c'est l'équivalent de l'action sur "soi-même")
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
// import { authOptions } from "../../../lib/auth"; // Décommente si nécessaire

export async function PUT(req: Request) {
  try {
    // 🛡️ DOUANE ABSOLUE : Qui es-tu ?
    const session = await getServerSession();
    const userUid = (session?.user as any)?.uid;
    
    if (!userUid) {
      return NextResponse.json({ message: "Oiseau non identifié. Le vent rejette tes murmures." }, { status: 401 });
    }

    // On extrait les mutations demandées (on ignore tout 'uid' qui serait envoyé par malice)
    const { frequenceHEX, sanctuaire, variationEntropie } = await req.json();

    // On utilise l'uid certifié par la session, jamais celui du body !
    const oiseau = await OiseauModel.findOne({ uid: userUid });
    if (!oiseau) return NextResponse.json({ message: "Fréquence introuvable." }, { status: 404 });

    // 🛡️ SÉCURITÉ LORE : L'Anneau de Sauron (Lockdown du compte)
    if (oiseau.sanctuaireVerrouille) {
      return NextResponse.json({ 
        message: "Votre sanctuaire est verrouillé. Le silence est de mise." 
      }, { status: 403 });
    }

    // Mise à jour de la forme libre (Elfe, Balrog, ou simple humain)
    if (sanctuaire) {
      oiseau.sanctuaire = { ...oiseau.sanctuaire, ...sanctuaire };
    }

    // 🌟 L'Orchestrateur gère la magie (Neo4j + Mongo + Algorithme d'Entropie)
    const oiseauOrch = new OiseauOrchestrator();
    const resultat = await oiseauOrch.appliquerFluctuation(
      oiseau, 
      frequenceHEX, 
      variationEntropie 
    );

    return NextResponse.json({
      message: "La structure a muté.",
      etat: resultat
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur de fluctuation :", error);
    return NextResponse.json({ message: "La magie s'est dissipée avant d'agir." }, { status: 500 });
  }
}