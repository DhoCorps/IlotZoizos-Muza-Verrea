import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../../lib/auth';
import { storageService } from '../../../../../../modules/storage/storage.service';
import { IlotError } from '@ilot/shared-core';
import { checkRateLimit } from '../../../../../../modules/security/rateLimiter';
// Importe ton modèle Mongoose si tu souhaites lier l'URL directement en base :
// import { ProductModel } from '@ilot/infrastructure';

export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. 🛡️ Sécurité : Vérification de l'Aura (Authentification)
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    // 2. 🛡️ Rate Limiting par IP contre le spam d'upload
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const { allowed } = await checkRateLimit(`upload-product-slug:${clientIp}`, 10, 60);
    if (!allowed) {
      return NextResponse.json({ error: 'Trop de téléversements. Veuillez patienter.' }, { status: 429 });
    }

    const { slug } = params;
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Aucune brindille (fichier) fournie.' }, { status: 400 });
    }

    // 3. Génération de la clé structurée unique basée sur le slug du produit
    const structuredKey = storageService.generateStructuredKey({
      inceptId: 'hub-central',
      locale: 'fr',
      entityType: 'projects', // ou 'products' selon ta structure
      entityId: slug,
      imageType: 'product_image',
      filename: file.name,
    });

    // 4. Téléversement optimisé vers Cloudflare R2 (Cache Edge immutable inclus)
    const uploadResult = await storageService.uploadFile(file, structuredKey);

    // 5. Synchronisation avec la Silice (MongoDB) via le slug
    // await ProductModel.findOneAndUpdate(
    //   { slug }, 
    //   { $push: { images: uploadResult.publicUrl } }, // ou mise à jour de l'image principale
    //   { new: true }
    // );

    console.log(`🛍️ [Ecommerce] Image ancrée pour le produit [slug: ${slug}] : ${uploadResult.publicUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Illustration du produit scellée avec succès via son slug.',
      data: {
        url: uploadResult.publicUrl,
        key: uploadResult.key,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [ECOMMERCE SLUG UPLOAD ERROR] :', error);
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur.' }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Accès non autorisé.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return NextResponse.json({ error: 'URL de l\'artefact à purger manquante.' }, { status: 400 });
    }

    // Extraction de la clé et anéantissement physique de la trace sur R2
    const key = storageService.extractKeyFromUrl(fileUrl);
    await storageService.deleteFile(key);

    console.log(`🗑️ [Ecommerce] Artefact purgé pour le produit [slug: ${params.slug}]`);

    return NextResponse.json({ success: true, message: 'Artefact produit désintégré.' }, { status: 200 });

  } catch (error: any) {
    const status = error instanceof IlotError ? error.status : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}