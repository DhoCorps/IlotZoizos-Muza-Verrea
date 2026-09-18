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

// 🛡️ Schéma Zod strict pour la création d'une quête de recrutement
const CreateJobQuestSchema = z.object({
  title: z.string().min(1, "Le titre de la quête est requis."),
  description: z.string().min(1, "La description est requise."),
  requirements: z.array(z.string()).optional(),
  reward: z.string().optional(),
  category: z.string().optional(),
});

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