export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel, generateOiseauIdentity } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';

// ==========================================
// POST : L'Éveil de l'Oiseau (Onboarding & Attribution d'Identité)
// ==========================================
export const POST = withAura(async (_req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
    try {
        const userUid = currentUser.uid || currentUser.id;

        // 1. Recherche de l'Oiseau dans la Silice
        const oiseau = await OiseauModel.findOne({ uid: userUid });
        if (!oiseau) {
            return NextResponse.json({ success: false, error: "Empreinte introuvable dans la canopée." }, { status: 404 });
        }

        // 2. Si l'Oiseau a déjà son identité organique (Onboarding déjà passé)
        if ((oiseau as { isOnboarded?: boolean; pseudo?: string; frequenceHEX?: string }).isOnboarded) {
            return NextResponse.json({
                success: true,
                message: "L'Oiseau a déjà franchi la porte de l'éveil.",
                data: { pseudo: oiseau.pseudo, frequenceHEX: oiseau.frequenceHEX }
            }, { status: 200 });
        }

        // 3. Forge de l'identité (Univers'Hall)
        const newIdentity = await generateOiseauIdentity();

        // 4. Sédimentation dans Mongoose
        oiseau.pseudo = newIdentity.pseudo;
        oiseau.frequenceHEX = newIdentity.frequenceHEX;
        (oiseau as { isOnboarded?: boolean }).isOnboarded = true;
        
        await (oiseau as unknown as { save: () => Promise<unknown> }).save();

        // 🌀 BOOM ! Invalidation chirurgicale du cache en cascade
        revalidateTag('oiseaux');
        revalidateTag(`profile-${userUid}`);
        if (oiseau.slug) {
            revalidateTag(`profile-${oiseau.slug}`);
        }

        console.log(`✨ [Onboarding] Nouvelle identité organique pour ${userUid} : ${newIdentity.pseudo}`);

        return NextResponse.json({
            success: true,
            message: "Identité vibratoire attribuée avec succès. Bienvenue dans l'Îlot.",
            data: {
                pseudo: oiseau.pseudo,
                frequenceHEX: oiseau.frequenceHEX
            }
        }, { status: 200 });

    } catch (error: unknown) {
        return handleRouteError(error, "USERS ONBOARDING FATAL ERROR");
    }
});