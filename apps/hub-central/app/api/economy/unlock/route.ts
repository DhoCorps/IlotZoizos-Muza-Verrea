export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { EconomyService, IOiseauInventoryDocument } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte du featureId)
// ==========================================
const UnlockPayloadSchema = z.object({
  featureId: z.string().min(1, "L'identifiant d'artefact (featureId) est requis.")
});

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateUnlockCascades(userUid: string): void {
  revalidateTag('economy');
  revalidateTag(`alveole-${userUid}`);
}

// ==========================================
// POST : Déverrouiller un artefact ou une capacité de la Canopée
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });
    }

    // 🛡️ Blindage strict via Zod
    const validation = UnlockPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Identifiant d\'artefact (featureId) manquant ou invalide.',
        details: validation.error.flatten() 
      }, { status: 400 });
    }

    const { featureId } = validation.data;
    const userUid = currentUser.uid;

    // Tentative de transaction non-marchande via le service
    const updatedInventory = (await EconomyService.unlockFeature(userUid, featureId)) as unknown as IOiseauInventoryDocument;

    // 💥 BOOM ! Invalidation chirurgicale du cache de l'économie du joueur via notre helper dédié
    revalidateUnlockCascades(userUid);

    return NextResponse.json({
      success: true,
      message: `La capacité [${featureId}] a été scellée dans votre Alvéole.`,
      data: {
        unlockedUnlocks: updatedInventory.unlockedUnlocks || [],
        remainingBalances: {
          parchemins: updatedInventory.parchemins,
          plumes: updatedInventory.plumes,
          vinyles: updatedInventory.vinyles,
          totamtoes: updatedInventory.totamtoes
        }
      }
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'La transaction a échoué.');
  }
});