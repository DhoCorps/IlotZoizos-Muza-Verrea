export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { generateOiseauIdentity } from '@ilot/infrastructure'; // Ou le chemin approprié vers ton générateur
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// POST : L'Éveil de l'Oiseau (Onboarding & Attribution d'Identité)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
    try {
        const userUid = currentUser.uid || currentUser.id;

        // 1. Recherche de l'Oiseau dans la Silice
        const oiseau = await OiseauModel.findOne({ uid: userUid });
        if (!oiseau) {
            return NextResponse.json({ error: "Empreinte introuvable dans la canopée." }, { status: 404 });
        }

        // 2. Si l'Oiseau a déjà son identité organique (Onboarding déjà passé)
        if ((oiseau as any).isOnboarded) {
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
        (oiseau as any).isOnboarded = true;
        
        await oiseau.save();

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

    } catch (error: any) {
        console.error("🔥 [API Onboarding Error] :", error);
        return NextResponse.json(
            { error: error.message || "Erreur interne de la matrice lors de l'éveil." }, 
            { status: 500 }
        );
    }
});