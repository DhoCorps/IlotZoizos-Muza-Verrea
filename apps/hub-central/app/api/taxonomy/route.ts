export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { TaxonomyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { withAura, withSilice, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedTaxonomies } from '@/lib/cache/taxonomy.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour la création d'un tag taxonomique
const CreateTaxonomySchema = z.object({
  name: z.string().min(1, "Le nom est requis."),
  domain: z.string().min(1, "Le domaine est requis."),
  type: z.string().min(1, "Le type est requis."),
}).passthrough();

const STATIC_TAXONOMIES = {
  categories: [
    { value: 'FONT_SPRITE', label: 'Police / Sprite' },
    { value: 'DIGITAL_GOOD', label: 'Bien Numérique' },
    { value: 'PHYSICAL_ARTIFACT', label: 'Objet Physique' },
    { value: 'LORE_SCROLL', label: 'Parchemin / Lore' }
  ],
  instruments: [
    { value: 'BASS', label: 'Basse / Fretless' },
    { value: 'GUITAR', label: 'Guitare' },
    { value: 'PIANO', label: 'Piano / Clavier' },
    { value: 'DRUMS', label: 'Batterie' },
    { value: 'VOCAL', label: 'Chant / Voix' },
    { value: 'OTHER', label: 'Autre / Synth' }
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

// ==========================================
// GET : Découverte des Taxonomies (Public)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const domain = url.searchParams.get('domain') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const tags = await getCachedTaxonomies(domain, type);
    
    return NextResponse.json({ 
       success: true, 
       data: tags,
      ...STATIC_TAXONOMIES 
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'TAXONOMY GET ERROR');
  }
});

// ==========================================
// POST : Sédimentation d'un Tag (Privé)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    const validation = CreateTaxonomySchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Données incomplètes ou invalides.", details: validation.error.flatten() }, { status: 400 });
    }

    const { name, domain, type } = validation.data;

    const existing = (await TaxonomyModel.findOne({ 
       name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
       domain 
    }).lean()) as { uid?: string; [key: string]: unknown } | null;
       
    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Tag existant." }, { status: 200 });
    }

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
  } catch (error: unknown) {
    return handleRouteError(error, 'TAXONOMY POST ERROR');
  }
});