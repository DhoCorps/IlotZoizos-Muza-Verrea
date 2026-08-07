import { NextResponse } from 'next/server';
import { connectToDatabase, TaxonomyModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v4 as uuidv4 } from 'uuid';

/**
 * 🌿 ROUTE TAXONOMIE DE L'ÎLOT (Hybride DB + Fallbacks Statiques)
 */
export async function GET(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. ÉVEIL DE LA SILICE
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TAXONOMY GET]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    // -------------------------------------------------------------------------
    // 2. SCRUTATION DES PARAMÈTRES DE RECHERCHE (URL)
    // -------------------------------------------------------------------------
    let url;
    try {
      url = new URL(req.url);
    } catch (urlErr) {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }

    const domain = url.searchParams.get('domain');
    const type = url.searchParams.get('type');

    const query: any = {};
    if (domain) query.domain = domain;
    if (type) query.type = type;

    // -------------------------------------------------------------------------
    // 3. RÉCUPÉRATION DEPUIS LA SILICE MONGODB
    // -------------------------------------------------------------------------
    let tags;
    try {
      tags = await TaxonomyModel.find(query).sort({ name: 1 }).lean();
    } catch (queryErr) {
      console.error("🔥 [TAXONOMY QUERY ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de lecture des taxonomies." }, { status: 500 });
    }

    // Référentiels statiques de secours pour alimenter instantanément les formulaires front-end
    const defaultTaxonomies = {
      categories: [
        { value: 'FONT_SPRITE', label: 'Police / Sprite' },
        { value: 'DIGITAL_GOOD', label: 'Bien Numérique' },
        { value: 'PHYSICAL_ARTIFACT', label: 'Objet Physique' },
        { value: 'LORE_SCROLL', label: 'Parchemin / Lore' }
      ],
      instruments: [
        { value: 'BASS', label: 'Basse / Fretless 🎸' },
        { value: 'GUITAR', label: 'Guitare 🎸' },
        { value: 'PIANO', label: 'Piano / Clavier 🎹' },
        { value: 'DRUMS', label: 'Batterie 🥁' },
        { value: 'VOCAL', label: 'Chant / Voix 🎤' },
        { value: 'OTHER', label: 'Autre / Synth 🎛️' }
      ],
      sujetCategories: [
        { value: 'MONOLOGUE', label: 'Monologue' },
        { value: 'POETRY', label: 'Poésie' },
        { value: 'TUTORIAL', label: 'Tutoriel' },
        { value: 'TRACK_NOTE', label: 'Note de Piste' }
      ],
      projectCategories: [
        { value: 'TECHNICAL', label: 'Technique' },
        { value: 'ARTISTIC', label: 'Artistique' },
        { value: 'SOCIAL', label: 'Social' }
      ]
    };

    return NextResponse.json({ 
      success: true, 
      data: tags,
      ...defaultTaxonomies // Permet aux composants d'utiliser soit data, soit les listes directes
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erreur globale lors de la lecture de la taxonomie :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}

// ==========================================
// POST : Sédimentation d'un nouveau Tag personnalisé
// ==========================================
export async function POST(req: Request) {
  try {
    // -------------------------------------------------------------------------
    // 1. CONTRÔLE DE LA DOUANE (SESSION)
    // -------------------------------------------------------------------------
    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("🔥 [SESSION ERROR TAXONOMY POST]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    // -------------------------------------------------------------------------
    // 2. ÉVEIL DE LA SILICE ET LECTURE DU CORPS (JSON)
    // -------------------------------------------------------------------------
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR TAXONOMY POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    const { name, domain, type } = body;

    if (!name || !domain || !type) {
      return NextResponse.json({ error: "Paramètres de taxonomie incomplets (name, domain, type requis)." }, { status: 400 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;

    // -------------------------------------------------------------------------
    // 3. VÉRIFICATION D'EXISTENCE (INDEPENDANT DE LA CASSE) ET CRÉATION
    // -------------------------------------------------------------------------
    let existing;
    try {
      existing = await TaxonomyModel.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
        domain 
      }).lean();
    } catch (queryErr) {
      console.error("🔥 [TAXONOMY FIND ERROR]", queryErr);
      return NextResponse.json({ error: "Échec de vérification du tag." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Ce tag existe déjà dans la matrice." }, { status: 200 });
    }

    let newTag;
    try {
      newTag = await TaxonomyModel.create({
        uid: `tax_${uuidv4()}`,
        name: name.trim(),
        domain,
        type,
        creatorUid: userUid,
        isCustom: true
      });
    } catch (createErr) {
      console.error("🔥 [TAXONOMY CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la sédimentation du tag." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newTag, message: "✨ Nouveau tag sédimenté avec succès !" }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale lors de la création d'un tag taxonomie :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
}