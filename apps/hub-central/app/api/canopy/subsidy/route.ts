export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SubsidyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext, handleRouteError } from '@/lib/api-guards';
import { getCachedSubsidies } from '@/lib/cache/canopy.cache';
import { z } from 'zod';

// 🛡️ Schéma de validation Zod strict pour le dépôt de subvention
const CreateSubsidySchema = z.object({
  title: z.string().min(1, "Le titre est requis."),
  motivation: z.string().min(1, "La motivation est requise."),
  requestedAmount: z.number().positive("Le montant demandé doit être positif."),
  currency: z.string().min(1, "La devise est requise."),
  isRented: z.boolean().optional().default(false),
});

// ==========================================
// GET : Récupérer les subventions de la Canopée (Privé / Aura)
// ==========================================
export const GET = withAura(async (_req: Request, _context: ApiContext, _currentUser: OiseauUser) => {
  try {
    const subsidies = await getCachedSubsidies();
    return NextResponse.json({ success: true, subsidies }, { status: 200 });
  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne lors de la récupération des subventions.");
  }
});

// ==========================================
// POST : Déposer une nouvelle subvention (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Corps de requête illisible." }, { status: 400 });
    }

    // 🛡️ Validation stricte via Zod
    const validationResult = CreateSubsidySchema.safeParse(rawBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues.map(e => e.message).join(', ');
      return NextResponse.json({ success: false, error: `Paramètres de subvention invalides : ${errorMessage}` }, { status: 400 });
    }

    const { title, motivation, requestedAmount, currency, isRented } = validationResult.data;
    
    // 🛡️ Uniformisation stricte sur currentUser.uid (garanti par le gardien withAura)
    const userId = currentUser.uid;

    const newSubsidy = await SubsidyModel.create({
      requesterUid: userId,
      title,
      motivation,
      requestedAmount,
      currency,
      isRented,
      status: 'PENDING'
    });
    
    revalidateTag('canopy-subsidies');
    return NextResponse.json({
      success: true,
      subsidy: newSubsidy
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Erreur interne du guichet.");
  }
});