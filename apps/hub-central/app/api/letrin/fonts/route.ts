export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { FontProject } from '@ilot/infrastructure';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withSilice, withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🧠 CACHE SÉCURISÉ : Recensement des projets de police mis en cache (60s) avec bypass en mode test
async function getCachedFontProjects() {
  const fetcher = async () => {
    return await FontProject.find({}).sort({ updatedAt: -1 }).lean();
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    ['letrin-font-projects-list'],
    { revalidate: 60, tags: ['fonts', 'font-projects'] }
  )();
}

// ==========================================
// 🔍 GET : Recenser tous les projets Letr'In (Public / Silice)
// ==========================================
export const GET = withSilice(async (_req: NextRequest, _context: ApiContext) => {
  try {
    const projects = await getCachedFontProjects();
    return NextResponse.json({ success: true, data: projects }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur globale GET Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});

// ==========================================
// 🚀 POST : Sédimenter un projet Letr'In (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    let newProject;
    try {
      newProject = await FontProject.create(body);
    } catch (createErr) {
      console.error("🔥 [LETRIN FONTS CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de sédimentation du projet." }, { status: 500 });
    }

    // 💥 BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateTag('fonts');
    revalidateTag('font-projects');

    return NextResponse.json({ success: true, data: newProject }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur globale POST Letr'In Fonts :", error);
    return NextResponse.json({ error: error.message || "Erreur interne." }, { status: 500 });
  }
});