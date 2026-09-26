export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktProfileModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedKontaktProfiles } from '@/lib/cache/kontakt.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod pour la création/sédimentation de profil Kontakt (Harmonisé)
const CreateKontaktProfileSchema = z.object({
  professionalTitle: z.string().min(1, "Le titre professionnel est requis."),
  seniorityYears: z.number().min(0).default(0),
  skills: z.array(z.string()).default([]),
  availabilityStatus: z.enum(['OPEN_TO_WORK', 'ON_A_QUEST', 'RECRUITED']).default('OPEN_TO_WORK'),
  portfolioUrl: z.string().url().nullable().optional(),
  
  // 🎲 --- LE SUPERFLU NÉCESSAIRE (Le "Flavor" RPG) ---
  archetypeClass: z.string().min(1, "L'archétype est requis"),
  alignment: z.enum([
    'LOYAL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD',
    'LOYAL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL',
    'LOYAL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL',
    'ANGE_INS', 'DEMON_INS', 'REPLICANT_BR', 'HUMAIN_BR'
  ]).default('TRUE_NEUTRAL'),
  attributes: z.object({
    force: z.number().min(1).max(20).default(10),
    agilite: z.number().min(1).max(20).default(10),
    intelligence: z.number().min(1).max(20).default(10),
    charisme: z.number().min(1).max(20).default(10),
    empathieVoightKampff: z.number().min(0).max(100).default(50),
  }).default({ force: 10, agilite: 10, intelligence: 10, charisme: 10, empathieVoightKampff: 50 }),
  specialArtifacts: z.array(z.string()).default([]),
  biographyLore: z.string().max(500, "Le lore ne doit pas dépasser le parchemin").default(''),
  
  // 💼 --- PORTFOLIO & REVIEWS ---
  portfolioItems: z.array(z.object({
    type: z.enum(['IMAGE', 'GITHUB_REPO', 'AUDIO', '3D', 'WEB']),
    url: z.string().url(),
    title: z.string().min(1),
    tags: z.array(z.string()).default([]),
  })).default([]),
  pricing: z.object({
    hourlyRateCents: z.number().min(0),
    missionRateCents: z.number().min(0),
    currency: z.string().default('EUR'),
  }).optional(),
  reviews: z.array(z.object({
    authorUid: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string(),
    isVerifiedHire: z.boolean().default(false),
    createdAt: z.coerce.date().optional(),
  })).default([]),

  // 🚀 --- SQUELETTE MUTUALISÉ ---
  tags: z.array(z.string()).default([]),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
  }).default({}),
  settings: z.object({
    allowDirectContact: z.boolean().default(true),
    showcaseBadge: z.boolean().default(true),
  }).default({ allowDirectContact: true, showcaseBadge: true }),
});

type CreateKontaktProfileInput = z.infer<typeof CreateKontaktProfileSchema>;

interface KontaktProfileDocument {
  uid: string;
  userUid: string;
  slug: string;
  professionalTitle?: string;
  [key: string]: unknown;
}

// ==========================================
// GET : Recenser les profils Kontakt (Public / Silice)
// ==========================================
export const GET = withSilice(async (req: NextRequest, _context: ApiContext) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ error: "URL de requête invalide." }, { status: 400 });
    }
    const searchParams = url.searchParams;
    const alignment = searchParams.get('alignment');
    const status = searchParams.get('status');
    const profiles = await getCachedKontaktProfiles(alignment, status);
    return NextResponse.json(profiles, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT PROFILES GET ERROR');
  }
});

// ==========================================
// POST : Sédimenter ou mettre à jour son profil Kontakt (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte des données entrantes via Zod
    const validation = CreateKontaktProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de profil invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateKontaktProfileInput = validation.data;

    const userUid = currentUser.uid || 'unknown';
    
    // Génération du Slug basé sur le titre professionnel avec gestion des collisions
    const baseSlug = slugify(sanitizedData.professionalTitle);
    let finalSlug = baseSlug;
          
    let slugExists: KontaktProfileDocument | null = null;
    try {
      slugExists = (await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } }).lean()) as KontaktProfileDocument | null;
    } catch (slugErr) {
      console.error("  [KONTAKT SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    let safetyCounter = 0;
    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = (await KontaktProfileModel.findOne({ slug: finalSlug, userUid: { $ne: userUid } }).lean()) as KontaktProfileDocument | null;
      } catch {
        break;
      }
      counter++;
      safetyCounter++;
    }

    // Vérifier si un profil existe déjà pour cet Oiseau
    let existing: KontaktProfileDocument | null = null;
    try {
      existing = (await KontaktProfileModel.findOne({ userUid }).lean()) as KontaktProfileDocument | null;
    } catch (findErr) {
      console.error("  [KONTAKT EXISTING CHECK ERROR]", findErr);
    }
          
    let profile: KontaktProfileDocument | null = null;
    try {
      if (existing) {
        profile = (await KontaktProfileModel.findOneAndUpdate(
          { userUid },
          { $set: { ...sanitizedData, slug: finalSlug } },
          { new: true }
        ).lean()) as KontaktProfileDocument | null;
      } else {
        const profileUid = `kontakt_${uuidv4()}`;
        profile = (await KontaktProfileModel.create({
          ...sanitizedData,
          uid: profileUid,
          userUid,
          slug: finalSlug,
        })) as unknown as KontaktProfileDocument;
      }
    } catch (saveErr) {
      console.error("  [KONTAKT PROFILE SAVE ERROR]", saveErr);
      return NextResponse.json({ error: "Échec de la sédimentation du profil en base." }, { status: 500 });
    }
    
    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-profiles');
    if (profile?.slug) {
      revalidateTag(`kontakt-profile-${profile.slug}`);
    }

    return NextResponse.json({
      success: true,
      message: "Profil Kontakt sédimenté avec succès.",
      data: profile
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT PROFILES POST ERROR');
  }
});