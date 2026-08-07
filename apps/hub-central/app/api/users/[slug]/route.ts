import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { authOptions } from "@/lib/auth"; 
import { IOiseau } from '@ilot/types';
import { slugify } from '@/lib/slugify'; // 🪡 Import indispensable

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();

    // 1. Résolution et slugification du paramètre
    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ message: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = slugify(rawSlug || ''); // 🪡 Application du slugify ici

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const visitorUid = (session?.user as any)?.uid;
    
    // 2. Comparaison robuste (slugifiée)
    const isSelf = visitorUid === targetSlug || (visitorUid ? slugify(visitorUid) === targetSlug : false);

    let oiseau = await OiseauModel.findOne({ 
      $or: [{ slug: targetSlug }, { uid: targetSlug }] 
    }).lean() as IOiseau | null;

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    if (isSelf) {
      return NextResponse.json({
        pseudo: oiseau.pseudo,
        email: oiseau.email, // 🪡 Présent uniquement pour soi-même
        frequenceHEX: oiseau.frequenceHEX,
        entropieActive: oiseau.entropieActive,
        sanctuaire: oiseau.sanctuaire,
        sanctuaireVerrouille: oiseau.sanctuaireVerrouille,
        isGhostMode: oiseau.isGhostMode,
        avatarUrl: oiseau.avatarUrl,
        coverPicture: oiseau.coverPicture,
        capabilities: oiseau.capabilities
      }, { status: 200 });
    }

    // Mode Standard (sans email)
    return NextResponse.json({
      pseudo: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      sanctuaire: oiseau.sanctuaire,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
}