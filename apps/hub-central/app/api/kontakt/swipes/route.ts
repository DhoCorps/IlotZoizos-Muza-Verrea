export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Sous-schéma pour le Matchmaking optionnel fourni par le front-end lors du Swipe
const MatchmakingDataSchema = z.object({
  questMaxBudgetCents: z.number().optional(),
  profileHourlyRateCents: z.number().optional(),
  questWorkArrangement: z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']).optional(),
  profileRemotePreference: z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE', 'FLEXIBLE']).optional(),
  questContractType: z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']).optional(),
  profileProfessionalStatus: z.enum(['FREELANCE', 'EMPLOYEE', 'JOB_SEEKER', 'STUDENT', 'ENTREPRENEUR', 'OTHER']).optional(),
  questExperienceLevel: z.enum(['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU']).optional(),
  profileExperienceLevel: z.enum(['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU']).optional(),
  questRequiredSkills: z.array(z.string()).optional(),
  profileSkills: z.array(z.string()).optional(),
  questTags: z.array(z.string()).optional(),
  profileTags: z.array(z.string()).optional(),
});

// 🛡️ Schéma Zod strict pour la validation du Swipe / Match
const RegisterSwipeSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible est requis."),
  action: z.enum(['LIKE', 'PASS'], { message: "L'action doit être 'LIKE' ou 'PASS'." }),
  matchmakingData: MatchmakingDataSchema.optional(), // 🆕 Données pour valider l'affinité avant de swiper
});

type RegisterSwipeInput = z.infer<typeof RegisterSwipeSchema>;

// ==========================================
// POST : Enregistrer un Swipe / Affinité (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation de la structure via Zod
    const validation = RegisterSwipeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Paramètres de swipe incomplets ou invalides.", details: validation.error.flatten() }, { status: 400 });
    }
    const sanitizedData: RegisterSwipeInput = validation.data;

    const swiperUid = currentUser.uid;
    if (!swiperUid) {
      return NextResponse.json({ error: "Oiseau non authentifié." }, { status: 401 });
    }

    // Appel de l'Orchestrator métier pour gérer la transaction Graph & Mongo
    const orchestrator = new KontaktOrchestrator();

    // 🔮 VÉRIFICATION D'AFFINITÉ (MATCHMAKING) AVANT LE LIKE
    if (sanitizedData.action === 'LIKE' && sanitizedData.matchmakingData) {
      // On passe les données à l'orchestrateur pour un calcul de compatibilité préventif
      const matchResult = await orchestrator.matchmakingEngine(sanitizedData.matchmakingData as any);
      
      if (!matchResult.isFavorable) {
        // Rejet ferme si la compatibilité est notoirement trop basse
        const criticalFlags = ['SKILLS_MISMATCH', 'INCOMPATIBLE_WORK_ARRANGEMENT', 'INCOMPATIBLE_CONTRACT_TYPE', 'OUT_OF_BUDGET', 'INSUFFICIENT_EXPERIENCE'];
        if (criticalFlags.includes(matchResult.matchFlag)) {
           return NextResponse.json({ 
             error: "L'Îlot juge cette affinité trop faible pour justifier une mise en relation.", 
             flag: matchResult.matchFlag,
             compatibilityScore: matchResult.compatibilityScore
           }, { status: 403 }); // 403 Forbidden : L'action est refusée par les règles métier
        }
      }
    }

    const swipeResult = await orchestrator.registerSwipe(
      {
        swiperUid,
        targetUid: sanitizedData.targetUid,
        action: sanitizedData.action,
      },
      {
        actorUid: swiperUid,
        capabilities: currentUser.capabilities || [],
      }
    );

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('kontakt-swipes');
    revalidateTag(`matches-${swiperUid}`);
    revalidateTag(`matches-${sanitizedData.targetUid}`);

    return NextResponse.json({
      success: true,
      message: "Swipe enregistré avec succès.",
      data: swipeResult,
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KONTAKT SWIPES POST ERROR');
  }
});