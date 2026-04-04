// apps/hub-central/app/api/upload-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 1. Initialisation du client S3 (Hors du handler pour la performance technique)
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

/**
 * L'ALCHIMIE NEXT.JS - UPLOAD R2 HEADLESS
 * Gère les requêtes POST entrantes sur /api/upload-test `<(:<Ô>:)>`
 */
export async function POST(req: NextRequest) {
  try {
    // 2. Extraction native de la brindille (Fini Multer !)
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : La brindille est manquante.' },
        { status: 400 }
      );
    }

    // 3. Conversion du fichier Web en Buffer Node.js pour le SDK AWS
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Structure de la clef (GâÖdz structurel)
    const safeFilename = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const customKey = `inceptions/tom-hat-toes/fr/projects/pilot-muza-nexus/images/${Date.now()}_${safeFilename}`;

    // 5. La commande de suture S3
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: customKey,
      Body: buffer,
      ContentType: file.type,
    });

    // 6. L'envoi vers Cloudflare R2
    await s3Client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;

    // 7. La réponse de Victoire
    return NextResponse.json(
      {
        success: true,
        message: 'La brindille technique a été ancrée avec succès dans le Nexus R2 via Next.js !',
        key: customKey,
        publicUrl: publicUrl,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Ineptitude technique lors de l'upload R2 :", error);
    return NextResponse.json(
      { success: false, message: "Le chaos a frappé la matrice d'upload." },
      { status: 500 }
    );
  }
}