import { NextResponse } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedObservatoryReport } from '@/lib/cache/users.cache';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// 🛡️ Schéma Zod défensif pour valider la structure du rapport de l'observatoire
const ObservatoryReportSchema = z.object({
  birdName: z.string().optional(),
  report: z.object({
    globalVibrationScore: z.number().optional(),
    status: z.string().optional(),
  }).passthrough(),
}).passthrough();

// -------------------------------------------------------------------------
// GET : L'Auscultation Vibratoire
// -------------------------------------------------------------------------
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 1. Résolution stricte, asynchrone et sécurisée des paramètres de route (Next.js App Router compatible)
    const resolvedParams = await Promise.resolve(context.params);
    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée de l'Oiseau en premier (Validation d'existence avant souveraineté)
    const bird: any = await findEntityBySlugOrUid(OiseauModel, identifier);
    if (!bird) {
      return NextResponse.json({ success: false, error: "Cet Oiseau est introuvable dans la volière." }, { status: 404 });
    }

    // 🛡️ 3. Contrôle de Souveraineté strict basé sur l'UID canonique de l'entité résolue (Propriétaire ou Administrateur)
    const isSelf = currentUser.uid === bird.uid;
    const isAdmin = currentUser.capabilities?.includes('*');

    if (!isSelf && !isAdmin) {
      return NextResponse.json({
         success: false,
         error: "Souveraineté violée : l'auscultation vibratoire d'un autre Oiseau est interdite."
       }, { status: 403 });
    }

    // 4. Appel au Cache / Rapport de l'Observatoire en utilisant son UID canonique résolu
    let data;
    try {
      data = await getCachedObservatoryReport(bird.uid);
    } catch (engineErr) {
      console.error("  [OBSERVATORY ENGINE ERROR]", engineErr);
      return NextResponse.json({ success: false, error: "Le moteur de sève a échoué." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ success: false, error: "Rapport introuvable pour cet Oiseau." }, { status: 404 });
    }

    // 🛡️ 5. Validation défensive Zod pour écarter toute structure partielle ou corrompue
    const validation = ObservatoryReportSchema.safeParse(data);
    if (!validation.success) {
      console.error("  [OBSERVATORY VALIDATION ERROR]", validation.error.flatten());
      return NextResponse.json({ success: false, error: "Le rapport vibratoire est corrompu." }, { status: 500 });
    }
    const safeData = validation.data;

    // 6. Réponse
    return NextResponse.json({
      success: true,
      birdName: safeData.birdName || bird.pseudo,
      report: safeData.report
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("  Fracture globale lors de l'auscultation :", error);
    return NextResponse.json({ success: false, error: "Erreur interne" }, { status: 500 });
  }
});