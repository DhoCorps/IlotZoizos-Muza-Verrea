// Fichier : app/api/canopy/subsidy/route.ts
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { SubsidyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';
import { getCachedSubsidies } from '@/lib/cache/canopy.cache';

export const GET = withAura(async (_req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
  }
  try {
    const subsidies = await getCachedSubsidies();
    return NextResponse.json({ success: true, subsidies }, { status: 200 });
  } catch (error: any) {
    console.error("  Erreur lors de la récupération des subventions :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne." }, { status });
  }
});

export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser | null) => {
  if (!currentUser) {
    return NextResponse.json({ error: "Oiseau non identifié" }, { status: 401 });
  }
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible." }, { status: 400 });
    }
    const { title, motivation, requestedAmount, currency, isRented } = body;
    if (!title || !motivation || !requestedAmount || !currency) {
      return NextResponse.json({ error: "Paramètres de subvention incomplets (titre, motivation, montant, devise requis)." }, { status: 400 });
    }
    const userId = currentUser.uid || currentUser.id;
    const newSubsidy = await SubsidyModel.create({
      requesterUid: userId,
      title,
      motivation,
      requestedAmount: Number(requestedAmount),
      currency,
      isRented: Boolean(isRented),
      status: 'PENDING'
    });
    
    revalidateTag('canopy-subsidies');
    return NextResponse.json({
      success: true,
      subsidy: newSubsidy
    }, { status: 201 });
  } catch (error: any) {
    console.error("  Erreur lors du dépôt de la subvention :", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json({ success: false, error: error.message || "Erreur interne du guichet." }, { status });
  }
});