export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { weaveFollowLink, severFollowLink } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';

// ==========================================
// 🛡️ SCHÉMA ZOD (Validation stricte de la payload)
// ==========================================
const FollowPayloadSchema = z.object({
  targetUid: z.string().min(1, "L'UID de la cible est requis dans la matrice."),
  targetType: z.enum([
    'USER', 'BLOG', 'PROJECT', 'GAME', 'FONT', 'SPRITE', 'LYRIKA', 'SAMPLOTEK', 'BIBLIOTEK', 'POETRIK'
  ], { message: "Type de cible non reconnu par la Canopée." }),
  action: z.enum(['FOLLOW', 'UNFOLLOW'], { message: "L'action doit être FOLLOW ou UNFOLLOW." }),
});

// ==========================================
// 🌊 FONCTION DE CASCADE DES TAGS (CACHE)
// ==========================================
function revalidateFollowCascades(targetUid: string, subscriberUid: string): void {
  revalidateTag(`followers-${targetUid}`);
  revalidateTag(`following-${subscriberUid}`);
  revalidateTag(`entity-${targetUid}`);
  revalidateTag('resonance');
}

// ==========================================
// 📡 POST : Tisser ou Rompre un lien d'abonnement (Canopée Tampon)
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "L'onde est muette : Corps de requête illisible." }, { status: 400 });
    }

    // 1. Blindage strict via Zod
    const validation = FollowPayloadSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Paramètres d'abonnement invalides.",
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { targetUid, targetType, action } = validation.data;
    const subscriberUid = currentUser.uid;

    // 2. Prévention des paradoxes (Auto-abonnement)
    if (subscriberUid === targetUid) {
      return NextResponse.json({ 
        success: false, 
        error: "Souveraineté paradoxale : L'Oiseau ne peut s'abonner à lui-même." 
      }, { status: 400 });
    }

    // 3. Exécution de la mutation dans le Graphe (Neo4j)
    if (action === 'FOLLOW') {
      await weaveFollowLink(subscriberUid, targetUid, targetType as any);
    } else {
      await severFollowLink(subscriberUid, targetUid);
    }

    // 4. BOOM ! Invalidation chirurgicale du cache en cascade
    revalidateFollowCascades(targetUid, subscriberUid);

    // 5. Réponse du Kosmos
    return NextResponse.json({
      success: true,
      message: action === 'FOLLOW'
        ? "Le lien a été tissé avec succès. Les échos vous parviendront."
        : "Le fil a été rompu. Le silence revient."
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, "RESONANCE FOLLOW POST FATAL ERROR");
  }
});