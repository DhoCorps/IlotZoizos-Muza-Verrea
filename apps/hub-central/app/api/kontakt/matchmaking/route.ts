export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { KontaktOrchestrator } from '@ilot/shared-core';
import {
  WorkArrangementSchema,
  RemotePreferenceSchema,
  ContractTypeSchema,
  ProfessionalStatusSchema,
  BudgetTypeSchema,
  EmploymentTypeSchema,
  ExperienceLevelSchema
} from '@ilot/types';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma Zod strict : utilise .options de @ilot/types pour conserver la SSOT tout en générant des types natifs locaux
const MatchmakingPayloadSchema = z.object({
  questMaxBudgetCents: z.number().min(0).optional(),
  questBudgetConstraint: z.object({
    minBudgetCents: z.number().min(0),
    maxBudgetCents: z.number().min(0),
  }).optional(),
  profileHourlyRateCents: z.number().min(0).optional(),
  questWorkArrangement: z.enum(WorkArrangementSchema.options).optional(),
  profileRemotePreference: z.enum(RemotePreferenceSchema.options).optional(),
  questContractType: z.enum(ContractTypeSchema.options).optional(),
  profileProfessionalStatus: z.enum(ProfessionalStatusSchema.options).optional(),
  
  questMinBudgetCents: z.number().min(0).nullable().optional(),
  questBudgetType: z.enum(BudgetTypeSchema.options).optional(),
  questEmploymentType: z.enum(EmploymentTypeSchema.options).optional(),
  questExperienceLevel: z.enum(ExperienceLevelSchema.options).optional(),
  profileExperienceLevel: z.enum(ExperienceLevelSchema.options).optional(),
  questRequiredSkills: z.array(z.string()).optional(),
  questRequirements: z.array(z.string()).optional(),
  questBonusSkills: z.array(z.string()).optional(),
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

    // ⚖️ Appel au Moteur de Matchmaking de l'Orchestrateur (Typage strict résolu)
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