// Fichier : app/api/economy/alveole/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { EconomyService } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedInventory } from '@/lib/cache/economy.cache';

// ==========================================
// GET : Récupérer le contenu de l'Alvéole de l'Oiseau[cite: 16]
// ==========================================
export const GET = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const inventory = await getCachedInventory(currentUser.uid);
    return NextResponse.json({
      success: true,
      data: inventory,
    }, { status: 200 });
  } catch (error: any) {
    console.error('  [ALVEOLE GET ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});

// ==========================================
// POST : Lancer l'expansion architecturale de l'Alvéole[cite: 16]
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    const updatedInventory = await EconomyService.upgradeAlveole(currentUser.uid);
    
    // 💥 BOOM ! Invalidation chirurgicale du cache[cite: 16]
    revalidateTag('economy');
    revalidateTag(`alveole-${currentUser.uid}`);
    
    console.log(`  [Alvéole] L'oiseau ${currentUser.uid} a fait évoluer son Alvéole au niveau ${updatedInventory.alveoleLevel} !`);
    return NextResponse.json({
      success: true,
      message: `Expansion réussie ! Votre lieu de stockage s'est étendu au niveau ${updatedInventory.alveoleLevel}.`,
      data: updatedInventory,
    }, { status: 200 });
  } catch (error: any) {
    console.error('  [ALVEOLE UPGRADE ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});