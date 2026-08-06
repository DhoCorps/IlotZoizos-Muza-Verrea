import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { OiseauModel } from '@ilot/infrastructure';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { authOptions } from '../../../../../lib/auth';

export async function PUT(req: Request) {
  try {
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionError) {
      console.error("🔥 [SESSION ERROR]", sessionError);
      return NextResponse.json({ message: "Erreur lors de la vérification de la session." }, { status: 500 });
    }

    const userUid = (session?.user as any)?.uid;
    
    if (!userUid) {
      return NextResponse.json({ message: "Oiseau non identifié. Le vent rejette tes murmures." }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ message: "Flux de mutation illisible." }, { status: 400 });
    }

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

    return NextResponse.json({
      message: "La structure a muté.",
      etat: resultat
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur de fluctuation :", error);
    return NextResponse.json({ message: "La magie s'est dissipée avant d'agir." }, { status: 500 });
  }
}