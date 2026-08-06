import { NextResponse } from 'next/server';
import { connectToDatabase, OrderModel } from '@ilot/infrastructure';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR ORDERS POST]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let body;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ error: "Corps de requête illisible ou malformé." }, { status: 400 });
    }

    let order;
    try {
      order = await OrderModel.create({
        uid: `ord_${uuidv4()}`,
        buyerUid: body.buyerUid || 'anonymous-bird',
        items: body.items,
        totalAmount: body.totalAmount,
        currency: body.currency || 'EUR',
        status: 'PAID'
      });
    } catch (createErr) {
      console.error("🔥 [ORDER CREATE ERROR]", createErr);
      return NextResponse.json({ error: "Échec de la sédimentation de la commande dans le grand livre." }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "✨ Commande sédimentée avec succès dans le grand livre de l'Îlot.",
      data: order 
    }, { status: 201 });

  } catch (error: any) {
    console.error("🔥 Erreur POST Order :", error);
    return NextResponse.json({ error: error.message || "Erreur interne de commande." }, { status: 500 });
  }
}