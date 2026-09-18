export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { slugify } from '@/lib/slugify';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedObservatoryReport } from '@/lib/cache/users.cache';
import { z } from 'zod';

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
export const GET = withAura(async (req: NextRequest, context: ApiContext, currentUser: OiseauUser) => {
  try {
    let resolvedParams;
    try {
      resolvedParams = await context.params;
      if (resolvedParams instanceof Promise) {
        resolvedParams = await resolvedParams;
      }
    } catch {
      return NextResponse.json({ success: false, error: "Paramètres de route invalides." }, { status: 400 });
    }

    const rawSlug = resolvedParams?.slug;
    const identifier = slugify(typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : '');

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifiant invalide." }, { status: 400 });
    }

    // 🔍 2. Résolution unifiée de l'Oiseau en premier (Validation d'existence avant souveraineté)
    const bird = (await findEntityBySlugOrUid(OiseauModel, identifier)) as { uid?: string; pseudo?: string; [key: string]: unknown } | null;
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
      data = await getCachedObservatoryReport(bird.uid || identifier);
    } catch (engineErr: unknown) {
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
    
  } catch (error: unknown) {
    return handleRouteError(error, "OBSERVATORY GET FATAL ERROR");
  }
});