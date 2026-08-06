import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure'; 
import { OiseauOrchestrator } from '@ilot/shared-core';

export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbError) {
      console.error("❌ [DB ERROR REGISTER]", dbError);
      return NextResponse.json({ message: "La Silice est inaccessible." }, { status: 500 });
    }
    
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
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

    const syncResult = await oiseauOrch.fosterOiseau({
      email,
      password,
      pseudo,
      frequenceHEX: frequenceHEX || '#2F4F4F',
    });

    const nouvelOiseau = syncResult.mongo;

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
}