export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// ⚙️ POST : Mettre à jour les préférences de diffusion (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const { sourceApp, consentForShowcase, consentForMusicSync } = body;
    const userUid = currentUser.uid || currentUser.id;

    // Mise à jour groupée ou par application source des consentements de l'oiseau dans le registre universel
    const filter: any = { ownerUid: userUid };
    if (sourceApp) {
      filter.sourceApp = sourceApp;
    }

    const updateData: any = {};
    if (typeof consentForShowcase === 'boolean') updateData.consentForShowcase = consentForShowcase;
    if (typeof consentForMusicSync === 'boolean') updateData.consentForMusicSync = consentForMusicSync;

    await UniversalMediaModel.updateMany(filter, { $set: updateData });

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('universal-media');
    revalidateTag(`showcase-${userUid}`);

    return NextResponse.json({
      success: true,
      message: "Préférences de la canopée mises à jour avec succès.",
      ownerUid: userUid,
      updatedPreferences: updateData
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [SHOWCASE PREFS ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne de la matrice." }, { status });
  }
});