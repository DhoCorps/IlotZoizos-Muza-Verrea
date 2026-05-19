// apps/hub-central/app/api/users/[userId]/actions/leave/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { authOptions } from "../../../../../../lib/auth"; 
import { TeamOrchestrator } from '@ilot/shared-core/src/sync-engine/team.orchestrator'; // Vérifie que le nom du fichier est bien OiseauOrchestrator
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import { IOiseau, ActionSignature } from '@ilot/types';
import { OiseauOrchestrator } from '@ilot/shared-core/src/sync-engine/user.orchestrator'; // 🪡 SUTURE : Correction du nom de classe

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  try {
    await connectToDatabase();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid;
    
    if (!userUid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    if (userUid !== params.userId) return NextResponse.json({ error: "Souveraineté violée" }, { status: 403 });

    // 🛡️ SÉCURITÉ : Lecture sécurisée du body
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 });
    }

    const { mode, teamId } = body;
    if (!teamId || !mode) return NextResponse.json({ error: "Données incomplètes" }, { status: 400 });

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: (session?.user as any)?.capabilities || []
    };

    const orchestrator = new OiseauOrchestrator();
    
    // 🛡️ EXÉCUTION SÉCURISÉE
    const result = await orchestrator.exileOiseau(userUid, signature); 

    // Retour explicite
    return NextResponse.json(result || { success: true }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 DÉTAIL FRACTURE:", error);
    // 🛡️ RÉPONSE JSON GARANTIE : Même en cas d'erreur, on renvoie du JSON pour le client
    return NextResponse.json(
      { error: error.message || "Erreur interne" }, 
      { status: 500 }
    );
  }
}

/**
 * 🛡️ INTERFACE DE TRANSITION (Souveraineté des Types)
 * Pour éviter l'erreur "Property capabilities does not exist"
 */
interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// --- 🔍 LECTURE DU SIGNAL (GET) ---
export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    await connectToDatabase();
    
    // 1. Récupération de la session avec authOptions (indispensable)
    const session = await getServerSession(authOptions);
    const user = session?.user as OiseauUser | undefined;
    
    const visitorUid = user?.uid;
    const isSelf = visitorUid === params.userId;

    const oiseau = await OiseauModel.findOne({ uid: params.userId }).lean() as IOiseau | null;
    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // 🏗️ UTILITAIRE : Harmonisation pour le Front
    const baseProfile = {
      uid: oiseau.uid,
      username: oiseau.pseudo,
      frequenceHEX: oiseau.frequenceHEX,
      avatarUrl: oiseau.avatarUrl,
      coverPicture: oiseau.coverPicture,
      capabilities: oiseau.capabilities,
      signature: oiseau.sanctuaire?.signature || "Pas de signature"
    };

    // --- 🛡️ LE MIROIR INTIME ---
    if (isSelf) {
      return NextResponse.json({
        ...baseProfile,
        email: oiseau.email,
        entropieActive: oiseau.entropieActive,
        sanctuaire: oiseau.sanctuaire,
        sanctuaireVerrouille: oiseau.sanctuaireVerrouille,
        isGhostMode: oiseau.isGhostMode,
        characterSheet: oiseau.sanctuaire?.characterSheet || {}
      }, { status: 200 });
    }

    // --- 🌑 LE SANCTUAIRE VERROUILLÉ ---
    if (oiseau.sanctuaireVerrouille) {
      return NextResponse.json({
        username: oiseau.pseudo,
        frequenceHEX: '#000000',
        signature: "L'écho s'est éteint.",
        sanctuaire: oiseau.sanctuaire,
        avatarUrl: null,
        coverPicture: null
      }, { status: 200 });
    }

    // --- 🌫️ LE MODE GHOST ---
    if (oiseau.isGhostMode) {
      return NextResponse.json({
        username: oiseau.pseudo,
        frequenceHEX: oiseau.frequenceHEX,
        signature: "Cet esprit observe en silence.",
        avatarUrl: oiseau.avatarUrl,
        capabilities: oiseau.capabilities
      }, { status: 200 });
    }

    // --- 🕊️ MODE STANDARD ---
    return NextResponse.json({
      ...baseProfile,
      sanctuaire: oiseau.sanctuaire,
      characterSheet: oiseau.sanctuaire?.characterSheet || {}
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Interférence réseau (GET User):", error);
    return NextResponse.json({ message: "Interférence réseau." }, { status: 500 });
  }
}

