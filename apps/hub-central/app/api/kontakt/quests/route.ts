export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { JobQuestModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { slugify } from '@/lib/slugify';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des quêtes actives mis en cache (60s) avec bypass en mode test
async function getCachedActiveQuests() {
  const fetcher = async () => {
    return await JobQuestModel.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['kontakt-active-quests'],
    { revalidate: 60, tags: ['job-quests', 'kontakt-quests'] }
  )();
}

// ==========================================
// 🔍 GET : Recenser les quêtes actives (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: Request, _context: ApiContext) => {
  try {
    const quests = await getCachedActiveQuests();
    return NextResponse.json(quests, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors du recensement des quêtes :", error);
    return NextResponse.json({ error: error.message || "Échec du recensement." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Publier une quête de recrutement (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // Génération du Slug pour la quête avec gestion des collisions
    let baseSlug = slugify(body.title || 'quete-sans-nom');
    let finalSlug = baseSlug;
    
    let slugExists;
    try {
      slugExists = await JobQuestModel.findOne({ slug: finalSlug }).lean();
    } catch (slugErr) {
      console.error("🔥 [QUEST SLUG CHECK ERROR]", slugErr);
    }

    let counter = 1;
    while (slugExists) {
      finalSlug = `${baseSlug}-${counter}`;
      try {
        slugExists = await JobQuestModel.findOne({ slug: finalSlug }).lean();
      } catch (slugErr) {
        break;
      }
      counter++;
    }

    const questUid = `quest_${uuidv4()}`;
    let newQuest;
    try {
      newQuest = await JobQuestModel.create({
        ...body,
        uid: questUid,
        slug: finalSlug,
        status: 'ACTIVE'
      });
    } catch (createErr) {
      console.error("🔥 [QUEST CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de l'enregistrement de la quête en base." }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('job-quests');
    revalidateTag('kontakt-quests');

    return NextResponse.json({
      success: true,
      message: "Quête de recrutement publiée avec succès.",
      data: newQuest
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la publication de la quête :", error);
    return NextResponse.json({ error: error.message || "Échec de la publication." }, { status: 500 });
  }
});