export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { EconomyService } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🌾 POST : Verser des ressources dans l'Alvéole
// ==========================================
export const POST = withAura(async (req: Request, context: ApiContext, currentUser: OiseauUser) => {
  try {
    // Parsing robuste pour éviter le crash serveur si le body est vide
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const { parchemins, plumes, vinyles, sampleNotes, totamtoes } = body;

    const updatedInventory = await EconomyService.addResources(currentUser.uid, {
      parchemins: Number(parchemins) || 0,
      plumes: Number(plumes) || 0,
      vinyles: Number(vinyles) || 0,
      sampleNotes: Number(sampleNotes) || 0,
      totamtoes: Number(totamtoes) || 0,
    });

    // 💥 BOOM ! Invalidation chirurgicale du cache
    revalidateTag('economy');
    revalidateTag(`alveole-${currentUser.uid}`);

    return NextResponse.json({
      success: true,
      message: 'Ressources récoltées et stockées dans l’Alvéole avec succès.',
      data: updatedInventory,
    }, { status: 200 });

  } catch (error: any) {
    console.error('🔥 [HARVEST ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
});