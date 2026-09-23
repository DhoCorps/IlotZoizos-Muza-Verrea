export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { DemopraxyOrchestrator } from '@ilot/shared-core';
import { withOptionalAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { SanctionCategory } from '@ilot/types';

// ==========================================
// 📖 GET : Consulter le Registre Public de Justice Démopraxique (Public / Optionnel Aura avec Pagination)
// ==========================================
export const GET = withOptionalAura(async (req: NextRequest, _context: ApiContext, _currentUser?: OiseauUser) => {
  try {
    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      return NextResponse.json({ success: false, error: "URL de requête invalide." }, { status: 400 });
    }

    const sanctionCategory = url.searchParams.get('sanctionCategory') as SanctionCategory | 'ALL' | undefined;
    const tag = url.searchParams.get('tag') || undefined;
    const isExcludedParam = url.searchParams.get('isExcluded');
    const isExcluded = isExcludedParam !== null ? isExcludedParam === 'true' : undefined;

    // Paramètres de pagination performante (modèle Bibliotek)[cite: 6]
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    const orchestrator = new DemopraxyOrchestrator();
    const registerData = await orchestrator.getDemopraxicRegister({
      page,
      limit,
      sanctionCategory,
      tag,
      isExcluded
    });

    return NextResponse.json(registerData, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la lecture du registre de justice.");
  }
});