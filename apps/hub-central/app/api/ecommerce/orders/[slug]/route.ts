// apps/hub-central/app/api/ecommerce/orders/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { connectToDatabase } from '@ilot/infrastructure';
import mongoose, { Document } from 'mongoose';

// 🪡 1. Interface TypeScript stricte pour éviter les erreurs de typage Mongoose
export interface IOrderItem {
  productUid: string;
  title: string;
  quantity: number;
  pricePaid: number;
  currency: 'EUR' | 'SHARDS';
}

export interface IOrderDocument extends Document {
  uid: string;
  buyerUid: string;
  items: IOrderItem[];
  totalAmount: number;
  currency: 'EUR' | 'SHARDS';
  status: 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
}

// 2. Schéma et Modèle typés
const OrderSchema = new mongoose.Schema<IOrderDocument>({
  uid: { type: String, required: true, unique: true },
  buyerUid: { type: String, required: true },
  items: [
    {
      productUid: { type: String, required: true },
      title: { type: String, required: true },
      quantity: { type: Number, required: true },
      pricePaid: { type: Number, required: true },
      currency: { type: String, enum: ['EUR', 'SHARDS'], required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  currency: { type: String, enum: ['EUR', 'SHARDS'], required: true },
  status: { type: String, enum: ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'], default: 'PAID' },
  createdAt: { type: Date, default: Date.now }
});

const OrderModel = mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// ==========================================
// GET : Ausculter une commande spécifique
// ==========================================
export async function GET(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const order = await OrderModel.findOne({ 
      $or: [{ uid: slug }, { _id: mongoose.isValidObjectId(slug) ? slug : null }] 
    }).lean() as IOrderDocument | null;

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable dans le grand livre de l'Îlot." }, { status: 404 });
    }

    // Vérification d'accès : Seul l'acheteur ou un administrateur peut inspecter la transaction
    const isAdmin = (session?.user as any)?.capabilities?.includes('ADMIN');
    if (order.buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Accès refusé à cette transaction." }, { status: 403 });
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Order Details :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ==========================================
// PATCH : Mettre à jour le statut d'une commande
// ==========================================
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const body = await req.json();
    
    const session = await getServerSession(authOptions);
    const userUid = (session?.user as any)?.uid || (session?.user as any)?.id;

    if (!userUid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    const order = await OrderModel.findOne({ 
      $or: [{ uid: slug }, { _id: mongoose.isValidObjectId(slug) ? slug : null }] 
    });

    if (!order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const isAdmin = (session?.user as any)?.capabilities?.includes('ADMIN');
    if (order.buyerUid !== userUid && !isAdmin) {
      return NextResponse.json({ error: "Action non autorisée sur cette commande." }, { status: 403 });
    }

    // Mise à jour des champs autorisés (ex: status)
    if (body.status && ['PENDING', 'PAID', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
      order.status = body.status;
      await order.save();
    }

    return NextResponse.json({ 
      success: true, 
      message: "✨ Statut de la commande mis à jour avec succès.", 
      data: order 
    }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur PATCH Order :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}