export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { CanopyJudgeEngine } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod pour le Tribunal de la Canopée
const SovereignJudgmentSchema = z.object({
  targetUid: z.string().min(1, "L'identifiant de la cible est requis."),
  action: z.enum(['JUDGE', 'PARDON'], { message: "L'action doit être 'JUDGE' ou 'PARDON'." }),
});

interface IOiseauDocument {
  isBanned?: boolean;
  bannedFingerprint?: string | null;
  ifvScore?: number;
  profileStatus?: string;
  save: () => Promise<unknown>;
  [key: string]: unknown;
}

// ==========================================
// POST : Exécuter un jugement ou lever le bannissement
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
    try {
        // Seul l'Architecte (Aura absolue '*') peut juger
        if (!currentUser.capabilities?.includes('*')) {
            return NextResponse.json({ success: false, error: "Aura insuffisante pour prononcer un jugement." }, { status: 403 });
        }

        let rawBody: unknown;
        try {
            rawBody = await req.json();
        } catch {
            return NextResponse.json({ success: false, error: "Paramètres de jugement incomplets ou illisibles." }, { status: 400 });
        }

        const validation = SovereignJudgmentSchema.safeParse(rawBody);
        if (!validation.success) {
            return NextResponse.json({ success: false, error: "Paramètres de jugement incomplets.", details: validation.error.flatten() }, { status: 400 });
        }

        const { targetUid, action } = validation.data; // action: 'JUDGE' | 'PARDON'

        // 🔍 Résolution unifiée de la cible (lean: false est crucial ici pour pouvoir utiliser .save() au moment du Pardon)
        const targetOiseau = (await findEntityBySlugOrUid(OiseauModel, targetUid, { lean: false })) as IOiseauDocument | null;
        
        if (!targetOiseau) {
            return NextResponse.json({ success: false, error: "Oiseau introuvable dans la Silice." }, { status: 404 });
        }

        if (action === 'JUDGE') {
            const fingerprint = targetOiseau.bannedFingerprint || 'unknown-fingerprint';
            const isBanned = await CanopyJudgeEngine.judgeAndExecute(targetUid, fingerprint);
            
            revalidateTag('users');
            revalidateTag(`profile-${targetUid}`);

            return NextResponse.json({
                success: true,
                message: isBanned 
                    ? "Le sceau est tombé : l'Oiseau a été banni à vie par son empreinte." 
                    : "L'Oiseau a été jugé digne de demeurer dans la canopée.",
                isBanned
            }, { status: 200 });

        } else if (action === 'PARDON') {
            targetOiseau.isBanned = false;
            targetOiseau.bannedFingerprint = null;
            targetOiseau.ifvScore = 50;
            targetOiseau.profileStatus = 'NEUTRAL';
            await targetOiseau.save();

            revalidateTag('users');
            revalidateTag(`profile-${targetUid}`);

            return NextResponse.json({
                success: true,
                message: "L'Îlot a étendu sa grâce : l'Oiseau est libéré de sa stase."
            }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "Action de jugement inconnue." }, { status: 400 });

    } catch (error: unknown) {
        return handleRouteError(error, 'JUDGMENT ERROR');
    }
});