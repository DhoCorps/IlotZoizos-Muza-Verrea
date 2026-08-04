// apps/hub-central/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { OiseauModel } from '@ilot/infrastructure/src/database/models/nosql/user.model';
import {IOiseau} from '@ilot/types'

export async function GET(req: Request, { params }: { params: { userId: string } }) {
  try {
    // 🛡️ DOUANE : Qui regarde dans le miroir ?
    const session = await getServerSession();
    const visitorUid = (session?.user as any)?.uid;
    const isSelf = visitorUid === params.userId;

    // .lean() pour alléger la mémoire, car on ne fait que lire.
    const oiseau = await OiseauModel.findOne({ uid: params.userId }).lean() as IOiseau | null;
    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // --- LE MIROIR INTIME (C'est moi qui me regarde) ---
    // Si l'Oiseau consulte son PROPRE profil, on lui renvoie toutes ses statistiques
    // privées (entropie, email, etc.) sans appliquer les filtres d'anonymisation.
    if (isSelf) {
      return NextResponse.json({
        pseudo: oiseau.pseudo,
        email: oiseau.email,
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

    // --- LE FILTRE DE RÉSONANCE (C'est un autre qui me regarde) ---
    // On ne renvoie pas le profil brut, on le formate selon son état d'âme actuel.

    if (oiseau.sanctuaireVerrouille) {
      // Le Balrog a disparu. On ne montre que l'épitaphe.
      return NextResponse.json({
        pseudo: oiseau.pseudo,
        frequenceHEX: '#000000', // Noir total
        sanctuaire: oiseau.sanctuaire, // Contiendra le message cryptique d'écrasement
        avatarUrl: null, // On cache l'avatar
        coverPicture: null
      }, { status: 200 });
    }

    if (oiseau.isGhostMode) {
      // Le Mode Ghost (Gris Bleuté / Silence). Le profil est embrumé.
      return NextResponse.json({
        pseudo: oiseau.pseudo,
        frequenceHEX: oiseau.frequenceHEX,
        message_statut: "Cet esprit observe en silence.",
        avatarUrl: oiseau.avatarUrl,
        capabilities: oiseau.capabilities
        // On ne renvoie pas le sanctuaire en mode Ghost
      }, { status: 200 });
    }

    // Mode Standard : Rencontre totale, polymorphisme affiché.
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