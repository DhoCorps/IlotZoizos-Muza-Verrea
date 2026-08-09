// apps/hub-central/app/api/kompta/ledger/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { LedgerEntryModel } from '@ilot/infrastructure'; // Ou chemin relatif vers l'infra/model

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Oiseau non authentifié.' }, { status: 401 });
    }

    const userUid = (session.user as any).uid || session.user.email;

    // Récupérer tout le grand livre de l'oiseau chronologiquement
    const entries = await LedgerEntryModel.find({ ownerUid: userUid }).sort({ createdAt: -1 }).lean();

    // Calculer les métriques financières en temps réel
    let totalCreditsCents = 0;
    let totalDebitsCents = 0;

    entries.forEach((entry: any) => {
      if (entry.type === 'CREDIT') totalCreditsCents += entry.amountCents;
      if (entry.type === 'DEBIT') totalDebitsCents += entry.amountCents;
    });

    return NextResponse.json({
      success: true,
      data: {
        entries,
        summary: {
          totalCredits: totalCreditsCents / 100,
          totalDebits: totalDebitsCents / 100,
          netBalance: (totalCreditsCents - totalDebitsCents) / 100,
          transactionCount: entries.length
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('[API Kompta Ledger Error] :', error);
    return NextResponse.json({ success: false, error: error.message || 'Erreur lors de la lecture du grand livre.' }, { status: 500 });
  }
}