import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure';
import { authOptions } from "@/lib/auth"; 
import { TeamOrchestrator } from '@ilot/shared-core'; 
import { IOiseau, ActionSignature } from '@ilot/types';
import { slugify } from '@/lib/slugify';

/**
 * 🌿 INTERFACE DES PARAMÈTRES
 * Le standard est désormais universellement basé sur le [slug]
 */
interface RouteParams {
  params: Promise<{ slug: string }>;
}

interface OiseauUser {
  id: string;
  uid: string;
  capabilities: string[];
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

// ==========================================
// 📤 POST : L'Oiseau quitte le Nid (Leave)
// ==========================================
export async function POST(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR LEAVE NEST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // 🛡️ Résolution et slugification asynchrone des paramètres
    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ error: "Paramètres de route invalides." }, { status: 400 });
    }
    const targetSlug = slugify(rawSlug || '');
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const userUid = (session?.user as OiseauUser | undefined)?.uid;
    
    // 🛡️ VÉRIFICATIONS DE GOUVERNANCE SOUVERAINE
    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
    }
    
    // On vérifie si l'utilisateur courant correspond bien au slug normalisé (ou son uid d'origine)
    if (userUid !== targetSlug && slugify(userUid) !== targetSlug) {
      return NextResponse.json({ error: "Souveraineté violée : vous ne pouvez forcer l'exil d'un autre." }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "L'onde est muette : Corps de requête invalide" }, { status: 400 });
    }

    const { mode, teamId } = body;
    if (!teamId || !mode) {
      return NextResponse.json({ error: "Données incomplètes pour déclencher l'envol." }, { status: 400 });
    }

    if (mode !== 'CLEAN' && mode !== 'TRACE') {
      return NextResponse.json({ error: "Mode d'envol inconnu (attendu: CLEAN ou TRACE)." }, { status: 400 });
    }

    const signature: ActionSignature = {
      actorUid: userUid,
      capabilities: (session?.user as OiseauUser | undefined)?.capabilities || []
    };

    let result;
    try {
      const orchestrator = new TeamOrchestrator();
      result = await orchestrator.leaveTeam(teamId, userUid, mode, signature); 
    } catch (orchErr: any) {
      console.error("🌋 [TEAM ORCHESTRATOR LEAVE ERROR]", orchErr);
      const status = orchErr.statusCode || orchErr.status || 400;
      return NextResponse.json({ error: orchErr.message || "Impossible de quitter le Nid." }, { status });
    }

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'envol :", error);
    return NextResponse.json({ error: error.message || "Erreur interne" }, { status: 500 });
  }
}

// ==========================================
// 🔍 GET : Lecture du Signal / Profil (Miroir)
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      return NextResponse.json({ message: "La Silice est injoignable." }, { status: 500 });
    }

    let rawSlug;
    try {
      const resolvedParams = await params;
      rawSlug = resolvedParams.slug;
    } catch (paramErr) {
      return NextResponse.json({ message: "Paramètres invalides." }, { status: 400 });
    }
    const targetSlug = slugify(rawSlug || '');
    
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      return NextResponse.json({ message: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const user = session?.user as OiseauUser | undefined;
    const visitorUid = user?.uid;
    const isSelf = visitorUid === targetSlug || (visitorUid ? slugify(visitorUid) === targetSlug : false);

    let oiseau;
    try {
      // Recherche par slug normalisé ou par uid
      oiseau = await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as IOiseau | null;
    } catch (queryErr) {
      return NextResponse.json({ message: "La requête s'est perdue dans la Silice." }, { status: 500 });
    }

    if (!oiseau) {
      return NextResponse.json({ message: "L'onde s'est dissipée : Oiseau introuvable." }, { status: 404 });
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