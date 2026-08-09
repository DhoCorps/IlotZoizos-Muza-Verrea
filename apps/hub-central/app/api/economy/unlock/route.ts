export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { EconomyService } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.featureId) {
      return NextResponse.json({ success: false, error: 'Identifiant d\'artefact (featureId) manquant.' }, { status: 400 });
    }

    const { featureId } = body;
    const userUid = currentUser.uid || currentUser.id;

    // Tentative de transaction non-marchande via le service
    const updatedInventory = await EconomyService.unlockFeature(userUid, String(featureId));

    // 💥 BOOM ! Invalidation chirurgicale du cache de l'économie du joueur
    revalidateTag('economy');
    revalidateTag(`alveole-${userUid}`);

    return NextResponse.json({
      success: true,
      message: `La capacité [${featureId}] a été scellée dans votre Alvéole.`,
      data: {
        unlockedUnlocks: updatedInventory.unlockedUnlocks,
        remainingBalances: {
          parchemins: updatedInventory.parchemins,
          plumes: updatedInventory.plumes,
          vinyles: updatedInventory.vinyles,
          totamtoes: updatedInventory.totamtoes
        }
      }
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('🔥 [ECONOMY UNLOCK ERROR] :', error);
    const err = error as { status?: number; statusCode?: number; message?: string };
    const status = err.status || err.statusCode || 400; // 400 par défaut (fonds insuffisants)
    return NextResponse.json({ success: false, error: err.message || 'La transaction a échoué.' }, { status });
  }
});