export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { JobQuestModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedActiveQuests } from '@/lib/cache/kontakt.cache';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour la création d'une quête de recrutement (Harmonisé avec @ilot/types)
const CreateJobQuestSchema = z.object({
  projectUid: z.string().min(1, "L'identifiant du projet est requis."),
  title: z.string().min(3, "Le titre de la quête est requis."),
  description: z.string().min(10, "La description est requise et doit faire au moins 10 caractères."),
  
  // 🏢 INFORMATIONS ENTREPRISE / GUILDE
  company: z.object({
    name: z.string().min(2, "Le nom de l'entreprise est requis"),
    description: z.string().min(10).default(''),
    websiteUrl: z.string().url().optional(),
    logoUrl: z.string().url().optional(),
  }).optional(),

  // 💼 LOGISTIQUE & CONDITIONS MATÉRIELLES
  workArrangement: z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']).default('FULL_REMOTE'),
  contractType: z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']).default('FREELANCE'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP']).default('FULL_TIME'),
  experienceLevel: z.enum(['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU']).default('CONFIRMED'),
  location: z.string().default('Remote'),

  // ⚖️ SUTURE MATCHMAKING
  minBudgetCents: z.number().min(0, "Le budget minimum ne peut être négatif").optional().nullable(),
  maxBudgetCents: z.number().min(0, "Le budget maximum ne peut être négatif").optional().nullable(),
  budgetType: z.enum(['DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY']).default('DAILY_RATE'),
  currency: z.string().default('EUR'),

  // ⏳ TEMPORALITÉ
  startDate: z.coerce.date().optional(),
  estimatedDuration: z.string().optional(),
  applicationDeadline: z.coerce.date().optional(),

  // 🎯 COMPÉTENCES & RÉCOMPENSES
  requiredSkills: z.array(z.string()).default([]),
  bonusSkills: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  rewardLore: z.string().optional(),

  // 🎲 LE SUPERFLU NÉCESSAIRE (Flavor RPG)
  questDifficulty: z.enum(['PEACEFUL', 'NORMAL', 'HARD', 'NIGHTMARE', 'LUNATIC']).default('NORMAL'),
  dangerLevel: z.number().min(0).max(100).default(10),
  perks: z.array(z.string()).default([]),

  // 🚀 SQUELETTE MUTUALISÉ & TAGS
 tags: z.array(z.string()).default([]),
  seo: z.object({
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional()
  }).default({}),
  settings: z.object({
    allowApplications: z.boolean().default(true),
  }).default({ allowApplications: true }), // 🛠️ Le fix est ici !
}).refine(
  (data) => {
    if (data.minBudgetCents != null && data.maxBudgetCents != null) {
      return data.minBudgetCents <= data.maxBudgetCents;
    }
    return true;
  },
  {
    message: "Hérésie mathématique : Le budget minimum ne peut pas être supérieur au budget maximum.",
    path: ["minBudgetCents"],
  }
);

type CreateJobQuestInput = z.infer<typeof CreateJobQuestSchema>;

interface JobQuestDocument {
  uid: string;
  slug: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

// ==========================================
// GET : Recenser les quêtes de recrutement (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const quests = await getCachedActiveQuests();
    return NextResponse.json(quests, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT QUESTS GET ERROR');
  }
});

// ==========================================
// POST : Publier une quête de recrutement (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation et assainissement via Zod
    const validation = CreateJobQuestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Données de quête invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: CreateJobQuestInput = validation.data;

    const baseSlug = slugify(sanitizedData.title);
    let finalSlug = baseSlug;

    let slugExists: JobQuestDocument | null = null;
    try {
      slugExists = (await JobQuestModel.findOne({ slug: finalSlug }).lean()) as JobQuestDocument | null;
    } catch (slugErr) {
      console.error("  [QUEST SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    let safetyCounter = 0;
    while (slugExists && safetyCounter < 50) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = (await JobQuestModel.findOne({ slug: finalSlug }).lean()) as JobQuestDocument | null;
      } catch {
        break;
      }
      counter++;
      safetyCounter++;
    }

    const questUid = `quest_${uuidv4()}`;
    let newQuest: JobQuestDocument;
    try {
      newQuest = (await JobQuestModel.create({
        ...sanitizedData,
        uid: questUid,
        slug: finalSlug,
        status: 'ACTIVE'
      })) as unknown as JobQuestDocument;
    } catch (createErr) {
      console.error("  [QUEST CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de la quête en base." }, { status: 500 });
    }

    // 💥 Invalidation chirurgicale du cache
    revalidateTag('job-quests');
    revalidateTag('kontakt-quests');

    return NextResponse.json({
      success: true,
      message: "Quête de recrutement publiée avec succès.",
      data: newQuest
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT QUESTS POST ERROR');
  }
});