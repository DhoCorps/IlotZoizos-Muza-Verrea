// apps/hub-central/app/api/kontakt/templates/route.ts
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@ilot/infrastructure';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Schéma Mongoose pour les Templates de CV / Artefacts
const CVTemplateSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  authorUid: { type: String, required: true },
  authorName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  priceShards: { type: Number, default: 0 }, // 0 = Offert / Public
  barterAccepted: { type: Boolean, default: true },
  letrinFontFamily: { type: String, default: 'sans' }, // Police Letr'In associée
  blocks: { type: Array, required: true },
  createdAt: { type: Date, default: Date.now }
});

const CVTemplateModel = mongoose.models.CVTemplate || mongoose.model('CVTemplate', CVTemplateSchema);

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const authorUid = searchParams.get('authorUid');

    const query: any = {};
    if (authorUid) query.authorUid = authorUid;

    const templates = await CVTemplateModel.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: templates }, { status: 200 });
  } catch (error: any) {
    console.error("🔥 Erreur GET Templates CV :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Oiseau non identifié. Publication rejetée." }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const userUid = (session.user as any).uid;
    const userName = (session.user as any).name || 'Oiseau Inconnu';

    const templateUid = `tmpl_${uuidv4()}`;
    const newTemplate = await CVTemplateModel.create({
      uid: templateUid,
      authorUid: userUid,
      authorName: userName,
      title: body.title || 'Parchemin Sans Nom',
      description: body.description || 'Modèle forgé dans la matrice.',
      priceShards: body.priceShards || 0,
      barterAccepted: body.barterAccepted ?? true,
      letrinFontFamily: body.letrinFontFamily || 'sans',
      blocks: body.blocks || []
    });

    return NextResponse.json({
      success: true,
      message: "Modèle de CV sédimenté et publié comme artefact.",
      data: newTemplate
    }, { status: 201 });
  } catch (error: any) {
    console.error("🔥 Erreur POST Template CV :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}