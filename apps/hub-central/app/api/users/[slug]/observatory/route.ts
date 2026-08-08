import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { ObservatoryEngine } from '@ilot/shared-core';
import { slugify } from '@/lib/slugify';
import { unstable_cache } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards'; // 🪡 Notre bouclier souverain strict

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// 🧠 CACHE : Récupération du Profil ET Calcul de l'Observatoire
// -------------------------------------------------------------------------
const getCachedObservatoryReport = (targetSlug: string) => {
  return unstable_cache(
    async () => {
      const userProfile = await OiseauModel.findOne({ 
        $or: [{ slug: targetSlug }, { uid: targetSlug }] 
      }).lean() as any;

      if (!userProfile) return null;

      // Synthèse de la Sève
      const observatoryData = {
        dependencies: [
          { id: 'dep-1', status: 1 },
          { id: 'dep-2', status: 1 }
        ],
        tasks: [
          { estimatedTime: 30, realTime: 25, weight: 3 },
          { estimatedTime: 60, realTime: 60, weight: 5 }
        ],
        exchanges: [
          { type: 'GIFT' as const, value: 40 },
          { type: 'TAKE' as const, value: 15 }
        ],
        emotionalIntensity: userProfile.emotionalIntensity || userProfile.entropieActive || 45, 
        currentAcceptance: userProfile.currentAcceptance || 3         
      };

      const report = ObservatoryEngine.generateReport(observatoryData);
      const birdName = userProfile.pseudo || userProfile.username || `Oiseau_${targetSlug.slice(-4)}`;

      return { birdName, report };
    },
    [`observatory-report-${targetSlug}`], 
    { 
      revalidate: 60, 
      tags: ['observatory', `profile-${targetSlug}`] 
    }
  )(); 
};

// -------------------------------------------------------------------------
// 👁️ GET : L'Auscultation Vibratoire
// -------------------------------------------------------------------------
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et sécurisée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const targetSlug = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    // 2. Contrôle de Souveraineté (Propriétaire ou Administrateur)
    const isSelf = currentUser.uid === targetSlug || slugify(currentUser.uid) === targetSlug;
    const isAdmin = currentUser.capabilities.includes('*');

    if (!isSelf && !isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: "Souveraineté violée : l'auscultation vibratoire d'un autre Oiseau est interdite." 
      }, { status: 403 });
    }

    // 3. Appel au Cache (Moteur + BDD)
    let data;
    try {
      data = await getCachedObservatoryReport(targetSlug);
    } catch (engineErr) {
      console.error("🌋 [OBSERVATORY ENGINE ERROR]", engineErr);
      return NextResponse.json({ success: false, error: "Le moteur de sève a échoué." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Cet Oiseau est introuvable dans la volière." }, { status: 404 });
    }

    // 4. Réponse
    return NextResponse.json({
      success: true,
      birdName: data.birdName,
      report: data.report
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture globale lors de l'auscultation :", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur interne" }, { status: 500 });
  }
});