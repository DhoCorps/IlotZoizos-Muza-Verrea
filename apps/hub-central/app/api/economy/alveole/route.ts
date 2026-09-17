export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { EconomyService, IOiseauInventoryDocument } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedInventory } from '@/lib/cache/economy.cache';

// ==========================================
// 💥 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateAlveoleCascades(userUid: string): void {
  revalidateTag('economy');
  revalidateTag(`alveole-${userUid}`);
}

// ==========================================
// GET : Récupérer le contenu de l'Alvéole de l'Oiseau
// ==========================================
export const GET = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const inventory = await getCachedInventory(currentUser.uid);
    return NextResponse.json({
      success: true,
      data: inventory,
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne lors de la consultation de l\'Alvéole.');
  }
});

// ==========================================
// POST : Lancer l'expansion architecturale de l'Alvéole
// ==========================================
export const POST = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Double cast sécurisé via unknown pour éviter l'erreur de conversion des Documents Mongoose
    const updatedInventory = (await EconomyService.upgradeAlveole(currentUser.uid)) as unknown as IOiseauInventoryDocument;
    
    // 💥 BOOM ! Invalidation chirurgicale du cache via notre helper dédié
    revalidateAlveoleCascades(currentUser.uid);
    
    return NextResponse.json({
      success: true,
      message: `Expansion réussie ! Votre lieu de stockage s'est étendu au niveau ${updatedInventory.alveoleLevel || 'supérieur'}.`,
      data: updatedInventory,
    }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, 'Erreur interne lors de l\'expansion de l\'Alvéole.');
  }
});