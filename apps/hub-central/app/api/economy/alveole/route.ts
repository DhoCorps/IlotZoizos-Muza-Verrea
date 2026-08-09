export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { EconomyService } from '@ilot/infrastructure';
import { unstable_cache, revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// 🛡️ CACHE SÉCURISÉ : Bypass automatique en mode test pour éviter les crashs Vitest
async function getCachedInventory(userUid: string) {
  const fetcher = async () => {
    return await EconomyService.getInventory(userUid);
  };

  if (process.env.NODE_ENV === 'test') {
    return await fetcher();
  }

  return await unstable_cache(
    fetcher,
    [`alveole-inventory-${userUid}`],
    { revalidate: 30, tags: ['economy', `alveole-${userUid}`] }
  )();
}

// ==========================================
// 📦 GET : Récupérer le contenu de l'Alvéole de l'Oiseau
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const inventory = await getCachedInventory(currentUser.uid);

    return NextResponse.json({
      success: true,
      data: inventory,
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [ALVEOLE GET ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// 🏗️ POST : Lancer l'expansion architecturale de l'Alvéole
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const updatedInventory = await EconomyService.upgradeAlveole(currentUser.uid);

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('economy');
    revalidateTag(`alveole-${currentUser.uid}`);

    console.log(`🏰 [Alvéole] L'oiseau ${currentUser.uid} a fait évoluer son Alvéole au niveau ${updatedInventory.alveoleLevel} !`);

    return NextResponse.json({
      success: true,
      message: `Expansion réussie ! Votre lieu de stockage s'est élevé au niveau ${updatedInventory.alveoleLevel}.`,
      data: updatedInventory,
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [ALVEOLE UPGRADE ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});