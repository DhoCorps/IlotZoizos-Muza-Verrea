export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { CanopyJudgeEngine } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// POST : Exécuter un jugement ou lever le bannissement
// ==========================================
export const POST = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
    try {
        // Seul l'Architecte (Aura absolue '*') peut juger
        if (!currentUser.capabilities.includes('*')) {
            return NextResponse.json({ success: false, error: "Aura insuffisante pour prononcer un jugement." }, { status: 403 });
        }

        const body = await req.json().catch(() => null);
        if (!body || !body.targetUid || !body.action) {
            return NextResponse.json({ success: false, error: "Paramètres de jugement incomplets." }, { status: 400 });
        }

        const { targetUid, action } = body; // action: 'JUDGE' | 'PARDON'

        const targetOiseau = await OiseauModel.findOne({ uid: targetUid });
        if (!targetOiseau) {
            return NextResponse.json({ success: false, error: "Oiseau introuvable dans la Silice." }, { status: 404 });
        }

        if (action === 'JUDGE') {
            const fingerprint = (targetOiseau as any).bannedFingerprint || 'unknown-fingerprint';
            const isBanned = await CanopyJudgeEngine.judgeAndExecute(targetUid, fingerprint);
            
            revalidateTag('users');
            revalidateTag(`profile-${targetUid}`);

            return NextResponse.json({
                success: true,
                message: isBanned 
                    ? "Le sceau est tombé : l'Oiseau has été banni à vie par son empreinte." 
                    : "L'Oiseau a été jugé digne de demeurer dans la canopée.",
                isBanned
            }, { status: 200 });

        } else if (action === 'PARDON') {
            targetOiseau.isBanned = false;
            (targetOiseau as any).bannedFingerprint = null;
            (targetOiseau as any).ifvScore = 50;
            (targetOiseau as any).profileStatus = 'NEUTRAL';
            await targetOiseau.save();

            revalidateTag('users');
            revalidateTag(`profile-${targetUid}`);

            return NextResponse.json({
                success: true,
                message: "L'Îlot a étendu sa grâce : l'Oiseau est libéré de sa stase."
            }, { status: 200 });
        }

        return NextResponse.json({ success: false, error: "Action de jugement inconnue." }, { status: 400 });

    } catch (error: any) {
        console.error("🔥 [Judgment Error] :", error);
        return NextResponse.json({ success: false, error: error.message || "Erreur interne du tribunal de la canopée." }, { status: 500 });
    }
});