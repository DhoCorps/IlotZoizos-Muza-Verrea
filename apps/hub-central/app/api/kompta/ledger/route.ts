export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards'; // Assure l'uniformité de nos erreurs

interface LedgerEntryDocument {
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  [key: string]: unknown;
}

// ==========================================
// 📒 GET : Consulter le Grand Livre (Strictement Privé / Aura)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid;

    // Récupérer tout le grand livre de l'oiseau chronologiquement
    const entries = (await LedgerEntryModel.find({ ownerUid: userUid })
      .sort({ createdAt: -1 })
      .lean()) as unknown as LedgerEntryDocument[];

    // Calculer les métriques financières en temps réel
    let totalCreditsCents = 0;
    let totalDebitsCents = 0;

    entries.forEach((entry) => {
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

  } catch (error: unknown) {
    return handleRouteError(error, 'KOMPTA LEDGER ERROR');
  }
});