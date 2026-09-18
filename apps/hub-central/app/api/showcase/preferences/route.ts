export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { UniversalMediaModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour les préférences du Showcase
const ShowcasePreferencesSchema = z.object({
  sourceApp: z.string().optional(),
  consentForShowcase: z.boolean().optional(),
  consentForMusicSync: z.boolean().optional(),
}).passthrough();

// ==========================================
// ⚙️ POST : Mettre à jour les préférences de diffusion (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const validation = ShowcasePreferencesSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Paramètres de préférences invalides.', details: validation.error.flatten() }, { status: 400 });
    }

    const validatedData = validation.data;
    
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par withAura)
    const userUid = currentUser.uid;

    // Mise à jour groupée ou par application source des consentements de l'oiseau dans le registre universel
    const filter: { ownerUid: string; sourceApp?: string } = { ownerUid: userUid };
    if (validatedData.sourceApp) {
      filter.sourceApp = validatedData.sourceApp;
    }

    const updateData: { consentForShowcase?: boolean; consentForMusicSync?: boolean } = {};
    if (typeof validatedData.consentForShowcase === 'boolean') updateData.consentForShowcase = validatedData.consentForShowcase;
    if (typeof validatedData.consentForMusicSync === 'boolean') updateData.consentForMusicSync = validatedData.consentForMusicSync;

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

  } catch (error: unknown) {
    return handleRouteError(error, 'SHOWCASE PREFS ERROR');
  }
});