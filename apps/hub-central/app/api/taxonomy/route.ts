// apps/hub-central/app/api/taxonomy/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase, TaxonomyModel } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain');
    const type = searchParams.get('type');

    const query: any = {};
    if (domain) query.domain = domain;
    if (type) query.type = type;

    const tags = await TaxonomyModel.find(query).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: tags }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la lecture de la taxonomie :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { name, domain, type } = body;

    if (!name || !domain || !type) {
      return NextResponse.json({ error: "Paramètres de taxonomie incomplets (name, domain, type requis)." }, { status: 400 });
    }

    const userUid = (session.user as any).uid || (session.user as any).id;

    // Vérifier si le tag existe déjà (insensible à la casse)
    const existing = await TaxonomyModel.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, 
      domain 
    });

    if (existing) {
      return NextResponse.json({ success: true, data: existing, message: "Ce tag existe déjà dans la matrice." }, { status: 200 });
    }

    const newTag = await TaxonomyModel.create({
      uid: `tax_${uuidv4()}`,
      name: name.trim(),
      domain,
      type,
      creatorUid: userUid,
      isCustom: true
    });

    return NextResponse.json({ success: true, data: newTag, message: "✨ Nouveau tag sédimenté avec succès !" }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Erreur lors de la création d'un tag taxonomie :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}