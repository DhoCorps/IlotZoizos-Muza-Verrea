// apps/hub-central/app/api/kontakt/templates/[slug]/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import { IlotError } from '@ilot/shared-core';
// Importe ton modèle Mongoose de template (adapte le chemin si nécessaire)
// import { TemplateModel } from '@ilot/infrastructure';

/**
 * 📖 GET : Récupère un template de CV / Parchemin par son slug
 */
export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // Simulation ou appel base de données réel :
    // const template = await TemplateModel.findOne({ slug });
    // if (!template) {
    //   return NextResponse.json({ error: 'Parchemin introuvable dans la matrice.' }, { status: 404 });
    // }

    // Mock temporaire si la base n'est pas encore branchée :
    const template = {
      slug,
      title: 'Template Cyberpunk Standard',
      description: 'Modèle optimisé pour les développeurs Fullstack et architectes de graphes.',
      letrinFontFamily: 'JetBrains Mono',
      priceShards: 0,
      authorName: 'DhÖ',
      blocks: []
    };

    return NextResponse.json({ success: true, data: template }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}

/**
 * ✍️ PUT : Met à jour un template existant
 */
export async function PUT(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const { slug } = params;
    const body = await req.json();

    // const updatedTemplate = await TemplateModel.findOneAndUpdate({ slug }, body, { new: true });

    return NextResponse.json({
      success: true,
      message: 'Le parchemin a été muté avec succès.',
      data: { slug, ...body }
    }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la mise à jour.' }, { status });
  }
}

/**
 * 🧨 DELETE : Supprime un template
 */
export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const { slug } = params;
    // await TemplateModel.findOneAndDelete({ slug });

    return NextResponse.json({
      success: true,
      message: `Le template [${slug}] a été désintégré de la matrice.`
    }, { status: 200 });
  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur lors de la suppression.' }, { status });
  }
}