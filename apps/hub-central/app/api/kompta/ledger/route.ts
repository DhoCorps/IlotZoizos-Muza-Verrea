export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from 'next/server';
import { LedgerEntryModel } from '@ilot/infrastructure';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { handleRouteError } from '@/lib/api-guards'; // Assure l'uniformité de nos erreurs
import { getCachedUserLedger } from '@/lib/cache/kompta.cache'; // 🚀 NOUVEAU : Import du Cache

interface LedgerEntryDocument {
  type: 'CREDIT' | 'DEBIT';
  amountCents: number;
  amountHTCents?: number;       // 🚀 ERP
  taxCents?: number;            // 🚀 ERP
  feeCents?: number;            // 🚀 ERP
  counterpartyUid?: string;     // 🚀 ERP
  counterpartyPseudo?: string;  // 🚀 ERP
  orderUid?: string;            // 🚀 ERP
  invoiceUid?: string;          // 🚀 ERP
  [key: string]: unknown;
}

// ==========================================
// 📒 GET : Consulter le Grand Livre (Strictement Privé / Aura avec Cache)
// ==========================================
export const GET = withAura(async (req: NextRequest, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userUid = currentUser.uid;

    // 🚀 NOUVEAU : Tentative de récupération via le Cache chirurgical
    let entries = (await getCachedUserLedger(userUid)) as unknown as LedgerEntryDocument[] | null;

    // Si le cache est vide ou expiré, on tape dans la Silice (Base de données)
    if (!entries) {
      entries = (await LedgerEntryModel.find({ ownerUid: userUid })
        .sort({ createdAt: -1 })
        .lean()) as unknown as LedgerEntryDocument[];
    }

    // Calculer les métriques financières en temps réel
    let totalCreditsCents = 0;
    let totalDebitsCents = 0;
    
    // 🚀 NOUVELLES METRIQUES ERP
    let totalHTCreditsCents = 0;
    let totalTaxCollectedCents = 0;
    let totalPlatformFeesCents = 0;

    entries.forEach((entry) => {
      if (entry.type === 'CREDIT') {
        totalCreditsCents += entry.amountCents;
        // On ne compte la TVA et le HT que sur les flux entrants (Ventes)
        totalHTCreditsCents += (entry.amountHTCents || 0);
        totalTaxCollectedCents += (entry.taxCents || 0);
        totalPlatformFeesCents += (entry.feeCents || 0);
      }
      if (entry.type === 'DEBIT') {
        totalDebitsCents += entry.amountCents;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        entries,
        summary: {
          totalCredits: totalCreditsCents / 100,
          totalDebits: totalDebitsCents / 100,
          netBalance: (totalCreditsCents - totalDebitsCents) / 100,
          // 🚀 METRIQUES FISCALES EXPOSÉES
          totalHTCredits: totalHTCreditsCents / 100,
          totalTaxCollected: totalTaxCollectedCents / 100,
          totalPlatformFees: totalPlatformFeesCents / 100,
          transactionCount: entries.length
        }
      }
    }, { status: 200 });

  } catch (error: unknown) {
    return handleRouteError(error, 'KOMPTA LEDGER ERROR');
  }
});