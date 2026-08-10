import { OiseauModel, LedgerEntryModel } from '@ilot/infrastructure';

export interface EvaluationMetrics {
    toxicMessagesCount: number;
    successfulBartersCount: number;
    helpfulnessScore: number; // Évalué par la communauté
}

export class CanopyJudgeEngine {
    /**
     * Calcule et met à jour l'Indice de Fréquence Vibratoire (IFV) d'un Oiseau
     */
    public static async evaluateProfile(userUid: string): Promise<{ ifvScore: number; status: 'RESPECTABLE' | 'NEUTRAL' | 'INDESIRABLE' }> {
        const oiseau = await OiseauModel.findOne({ uid: userUid });
        if (!oiseau) throw new Error("Oiseau introuvable pour évaluation.");

        // Récupération de l'historique des transactions et du comportement
        const tradesCount = await LedgerEntryModel.countDocuments({ ownerUid: userUid });
        
        // Base de calcul de l'IFV (de 0 à 100)
        let baseIfv = 50;
        baseIfv += tradesCount * 5; // Le commerce vertueux élève l'âme
        
        // Si l'oiseau a un passif de rapports de modération (simulé ici via un attribut ou par défaut)
        const penalties = (oiseau as any).moderationPenalties || 0;
        baseIfv -= penalties * 20;

        const ifvScore = Math.max(0, Math.min(100, baseIfv));

        let status: 'RESPECTABLE' | 'NEUTRAL' | 'INDESIRABLE' = 'NEUTRAL';
        if (ifvScore >= 75) status = 'RESPECTABLE';
        else if (ifvScore <= 25) status = 'INDESIRABLE';

        // Sauvegarde de l'état vibratoire dans la Silice
        (oiseau as any).ifvScore = ifvScore;
        (oiseau as any).profileStatus = status;
        await oiseau.save();

        return { ifvScore, status };
    }

    /**
     * Décide si un profil doit être banni à vie par l'Îlot
     */
    public static async judgeAndExecute(userUid: string, ipFingerprint: string): Promise<boolean> {
        const { ifvScore, status } = await this.evaluateProfile(userUid);

        if (status === 'INDESIRABLE' || ifvScore === 0) {
            // Sceau du bannissement éternel lié à l'empreinte IP
            await OiseauModel.updateOne(
                { uid: userUid },
                { $set: { isBanned: true, bannedFingerprint: ipFingerprint, banishedAt: new Date() } }
            );
            return true; // Banni
        }

        return false; // Sauvé
    }
}