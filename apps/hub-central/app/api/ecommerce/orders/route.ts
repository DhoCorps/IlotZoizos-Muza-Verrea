export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OrderModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import { withAura, OiseauUser, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🚀 POST : Sédimenter une commande dans le grand livre (Strictement Privé / Aura)
// ==========================================
export const POST = withAura(async (req: Request, _context: ApiContext, currentUser: OiseauUser) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    const buyerUid = currentUser.uid || currentUser.id || 'anonymous-bird';

    const order = await OrderModel.create({
      uid: `ord_${uuidv4()}`,
      buyerUid,
      items: body.items,
      totalAmount: body.totalAmount,
      currency: body.currency || 'EUR',
      status: 'PAID'
    });

    // 💥 Invalidation chirurgicale du cache en cascade
    revalidateTag('orders');
    revalidateTag(`user-orders-${buyerUid}`);

    return NextResponse.json({ 
      success: true, 
      message: "✨ Commande sédimentée avec succès dans le grand livre de l'Îlot.",
      data: order 
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur POST Order :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de commande." }, { status: 500 });
  }
});