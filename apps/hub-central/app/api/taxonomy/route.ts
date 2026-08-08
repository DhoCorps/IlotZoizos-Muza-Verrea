import { NextResponse } from 'next/server';
import { TaxonomyModel } from '@ilot/infrastructure';
import { unstable_cache, revalidateTag } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { withAura, withSilice, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🌿 Référentiels statiques (Sortis du scope pour éviter la redéfinition)
const STATIC_TAXONOMIES = {
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

// 🧠 CACHE : Récupération unifiée des taxonomies
const getCachedTaxonomies = async (domain?: string, type?: string) => {
  return unstable_cache(
    async () => {
      const query: any = {};
      if (domain) query.domain = domain;
      if (type) query.type = type;
      return await TaxonomyModel.find(query).sort({ name: 1 }).lean();
    },
    [`taxonomy-list`, JSON.stringify({ domain, type })],
    { revalidate: 3600, tags: ['taxonomy'] } // Cache 1h
  )();
};

// ==========================================
// 🔍 GET : Découverte des Taxonomies (Public)
// ==========================================
export const GET = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') || undefined;
    const type = searchParams.get('type') || undefined;

    const tags = await getCachedTaxonomies(domain, type);

    return NextResponse.json({ 
      success: true, 
      data: tags,
      ...STATIC_TAXONOMIES
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la lecture taxonomie :", error);
    return NextResponse.json({ error: "Échec de lecture des taxonomies." }, { status: 500 });
  }
});

// ==========================================
// 📤 POST : Sédimentation d'un Tag (Privé)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json();
    const { name, domain, type } = body;

    if (!name || !domain || !type) {
      return NextResponse.json({ error: "Données incomplètes." }, { status: 400 });
    }

    // 1. Vérification d'existence
    const existing = await TaxonomyModel.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      domain 
    }).lean();

    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Tag existant." }, { status: 200 });
    }

    // 2. Création
    const newTag = await TaxonomyModel.create({
      uid: `tax_${uuidv4()}`,
      name: name.trim(),
      domain,
      type,
      creatorUid: currentUser.uid,
      isCustom: true
    });

    // 💥 BOOM ! Invalidation cache
    revalidateTag('taxonomy');

    return NextResponse.json({ success: true, data: newTag, message: "✨ Tag sédimenté !" }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur création tag :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});