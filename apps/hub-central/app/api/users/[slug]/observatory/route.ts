import { NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedObservatoryReport } from '@/lib/cache/users.cache';

export const dynamic = 'force-dynamic';

// -------------------------------------------------------------------------
// GET : L'Auscultation Vibratoire
// -------------------------------------------------------------------------
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte et sécurisée des paramètres de route
    const resolvedParams = await context.params;
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 2. Contrôle de Souveraineté (Propriétaire ou Administrateur)
    const isSelf = currentUser.uid === identifier || slugify(currentUser.uid) === identifier;
    const isAdmin = currentUser.capabilities.includes('*');

    if (!isSelf && !isAdmin) {
      return NextResponse.json({
         success: false,
         error: "Souveraineté violée : l'auscultation vibratoire d'un autre Oiseau est interdite."
       }, { status: 403 });
    }

    // 🔍 3. Vérification préliminaire de l'existence de l'Oiseau via notre helper unifié
    const bird: any = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!bird) {
      return NextResponse.json({ success: false, error: "Cet Oiseau est introuvable dans la volière." }, { status: 404 });
    }

    // 4. Appel au Cache / Rapport de l'Observatoire en utilisant son UID canonique résolu
    let data;
    try {
      data = await getCachedObservatoryReport(bird.uid || identifier);
    } catch (engineErr) {
      console.error("  [OBSERVATORY ENGINE ERROR]", engineErr);
      return NextResponse.json({ success: false, error: "Le moteur de sève a échoué." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Rapport introuvable pour cet Oiseau." }, { status: 404 });
    }

    // 5. Réponse
    return NextResponse.json({
      success: true,
      birdName: data.birdName || bird.pseudo,
      report: data.report
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("  Fracture globale lors de l'auscultation :", error);
    return NextResponse.json({ success: false, error: error.message || "Erreur interne" }, { status: 500 });
  }
});