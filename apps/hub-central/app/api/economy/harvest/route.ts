export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { EconomyService, IOiseauInventoryDocument } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de la récolte)
// ==========================================
const HarvestPayloadSchema = z.object({
  parchemins: z.coerce.number().optional().default(0),
  plumes: z.coerce.number().optional().default(0),
  vinyles: z.coerce.number().optional().default(0),
  sampleNotes: z.coerce.number().optional().default(0),
  totamtoes: z.coerce.number().optional().default(0),
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateHarvestCascades(userUid: string): void {
  revalidateTag('economy');
  revalidateTag(`alveole-${userUid}`);
}

// ==========================================
// 🌾 POST : Verser des ressources dans l'Alvéole
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod pour éviter les injections ou valeurs corrompues
    const validation = HarvestPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Contrat souverain invalide : Format de récolte corrompu.',
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { parchemins, plumes, vinyles, sampleNotes, totamtoes } = validation.data;

    const updatedInventory = (await EconomyService.addResources(currentUser.uid, {
      parchemins,
      plumes,
      vinyles,
      sampleNotes,
      totamtoes,
    })) as unknown as IOiseauInventoryDocument;

    // 💥 BOOM ! Invalidation chirurgicale du cache via notre helper dédié
    revalidateHarvestCascades(currentUser.uid);

    return NextResponse.json({
      success: true,
      message: 'Ressources récoltées et stockées dans l’Alvéole avec succès.',
      data: updatedInventory,
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne lors de la récolte de ressources.');
  }
});