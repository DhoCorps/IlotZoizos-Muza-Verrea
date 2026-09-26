export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict pour valider le payload de matchmaking (Télétravail, Statut pro, Budget, Expérience & Compétences)
const MatchmakingPayloadSchema = z.object({
  questMaxBudgetCents: z.number().min(0).optional(),
  profileHourlyRateCents: z.number().min(0).optional(),
  questWorkArrangement: z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE']).optional(),
  profileRemotePreference: z.enum(['FULL_REMOTE', 'HYBRID', 'ON_SITE', 'FLEXIBLE']).optional(),
  questContractType: z.enum(['FREELANCE', 'CDI', 'CDD', 'INTERNSHIP', 'PARTNERSHIP', 'BOUNTY', 'OTHER']).optional(),
  profileProfessionalStatus: z.enum(['FREELANCE', 'EMPLOYEE', 'JOB_SEEKER', 'STUDENT', 'ENTREPRENEUR', 'OTHER']).optional(),
  
  questMinBudgetCents: z.number().min(0).nullable().optional(),
  questBudgetType: z.enum(['DAILY_RATE', 'FIXED_PRICE', 'YEARLY_SALARY']).optional(),
  questEmploymentType: z.enum(['FULL_TIME', 'PART_TIME', 'FREELANCE', 'CONTRACT', 'INTERNSHIP']).optional(),
  questExperienceLevel: z.enum(['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU']).optional(),
  profileExperienceLevel: z.enum(['APPRENTICE', 'JUNIOR', 'MID', 'CONFIRMED', 'SENIOR', 'LEAD', 'MASTER', 'GURU']).optional(),
  questRequiredSkills: z.array(z.string()).optional(),
  profileSkills: z.array(z.string()).optional(),

  questTags: z.array(z.string()).optional(),
  profileTags: z.array(z.string()).optional(),
});

// ==========================================
// POST : Évaluer la compatibilité / Matchmaking Harmonique (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = MatchmakingPayloadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Contrat souverain invalide : ${errorMessage}` }, { status: 400 });
    }

    const payload = validationResult.data;
    const orchestrator = new KontaktOrchestrator();

    // ⚖️ Appel au Moteur de Matchmaking de l'Orchestrateur
    const result = await orchestrator.matchmakingEngine(payload);

    return NextResponse.json({
      success: true,
      message: "Calcul de résonance et de matchmaking effectué avec succès.",
      data: result
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors du calcul du matchmaking Kontakt.");
  }
});