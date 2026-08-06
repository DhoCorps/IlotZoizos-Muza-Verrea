import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure'; // 🪡 Import unifié et propre
import { authOptions } from "../../../../lib/auth"; // Ajuste le chemin selon ton arborescence
import { IOiseau } from '@ilot/types';

/**
 * 🌿 INTERFACE DES PARAMÈTRES
 * Standard universel basé sur le [slug]
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR USER GET]", dbErr);
      return NextResponse.json({ message: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. RÉSOLUTION DES PARAMÈTRES (Next.js 15+)
    // -------------------------------------------------------------------------
    let resolvedParams;
    try {
      resolvedParams = await params;
    } catch (paramErr) {
      return NextResponse.json({ message: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = resolvedParams.slug;

    // -------------------------------------------------------------------------
    // 3. DOUANE : QUI REGARDE DANS LE MIROIR ?
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const visitorUid = (session?.user as any)?.uid;
    // On permet de vérifier par uid (l'utilisateur courant) vis-à-vis du slug demandé
    const isSelf = visitorUid === targetSlug;

    // -------------------------------------------------------------------------
    // 4. RÉCUPÉRATION DU PROFIL
    // -------------------------------------------------------------------------
    let oiseau;
    try {
      // Tolérance de recherche : par slug explicite ou par uid
      oiseau = await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as IOiseau | null;
    } catch (queryErr) {
      console.error("🔥 [USER QUERY ERROR]", queryErr);
      return NextResponse.json({ message: "La requête s'est perdue dans la Silice." }, { status: 500 });
    }

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée." }, { status: 404 });
    }

    // -------------------------------------------------------------------------
    // 5. APPLICATION DES FILTRES DE RÉSONANCE
    // -------------------------------------------------------------------------

    // --- LE MIROIR INTIME (C'est moi qui me regarde) ---
    // Si l'Oiseau consulte son PROPRE profil, on lui renvoie toutes ses statistiques privées.
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
        // On ne renvoie pas le sanctuaire ni le coverPicture en mode Ghost
      }, { status: 200 });
    }

    // --- MODE STANDARD ---
    // Rencontre totale, polymorphisme affiché.
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