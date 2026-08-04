// apps/hub-central/app/api/users/[userId]/observatory/route.ts
import { NextResponse } from 'next/server';
import { ObservatoryEngine } from '@ilot/shared-core';
// 1. 🪡 Importe ton modèle Mongoose utilisateur (adapte le chemin selon ton arborescence exacte)
import { OiseauModel } from '@ilot/infrastructure'; 
// Importe tes autres modèles si tu les as (ex: TaskModel, ExchangeModel)

export const dynamic = 'force-dynamic';

export async function GET(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const { userId } = params;

        // 2. 🪡 Déclaration et récupération réelle du profil utilisateur dans MongoDB
        const userProfile = await OiseauModel.findById(userId).lean();

        // Si l'Oiseau n'existe pas dans la matrice
        if (!userProfile) {
            return NextResponse.json({
                success: false,
                error: "Cet Oiseau est introuvable dans la volière."
            }, { status: 404 });
        }

        // Optionnel : Récupération de ses tâches et échanges réels
        /*
        const tasks = await TaskModel.find({ ownerId: userId }).lean();
        const exchanges = await ExchangeModel.find({ userId }).lean();
        */

        // 3. Constitution des données pour le moteur de sève
        const observatoryData = {
            dependencies: [
                { id: 'dep-1', status: 1 },
                { id: 'dep-2', status: 1 }
            ],
            tasks: [
                { estimatedTime: 30, realTime: 25, weight: 3 },
                { estimatedTime: 60, realTime: 60, weight: 5 }
            ],
            exchanges: [
                { type: 'GIFT' as const, value: 40 },
                { type: 'TAKE' as const, value: 15 }
            ],
            // Utilisation des propriétés de notre userProfile déclaré plus haut
            emotionalIntensity: (userProfile as any).emotionalIntensity || 45, 
            currentAcceptance: (userProfile as any).currentAcceptance || 3       
        };

        // 4. Calcul du rapport vibratoire
        const report = ObservatoryEngine.generateReport(observatoryData);
        const birdName = (userProfile as any).username || `Oiseau_${userId.slice(-4)}`;

        return NextResponse.json({
            success: true,
            birdName,
            report
        }, { status: 200 });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || "Erreur lors de l'auscultation vibratoire."
        }, { status: 500 });
    }
}