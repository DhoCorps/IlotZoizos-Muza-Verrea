export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 📒 GET : Consulter le Grand Livre (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const userUid = currentUser.uid || currentUser.id;

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
    console.error('🔥 [KOMPTA LEDGER ERROR] :', error);
    const status = error.status || error.statusCode || 500;
    return NextResponse.json({ success: false, error: error.message || 'Erreur lors de la lecture du grand livre.' }, { status });
  }
});