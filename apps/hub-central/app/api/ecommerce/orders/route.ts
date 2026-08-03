// apps/hub-central/app/api/ecommerce/orders/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, OrderModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const order = await OrderModel.create({
      uid: `ord_${uuidv4()}`,
      buyerUid: body.buyerUid || 'anonymous-bird',
      items: body.items,
      totalAmount: body.totalAmount,
      currency: body.currency || 'EUR',
      status: 'PAID'
    });

    return NextResponse.json({ 
      success: true, 
      message: "✨ Commande sédimentée avec succès dans le grand livre de l'Îlot.",
      data: order 
    }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Erreur POST Order :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}