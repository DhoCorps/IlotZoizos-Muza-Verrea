import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { connectToDatabase } from '../../../../../../packages/infrastructure'; // ⚠️ Ajuste le chemin selon ton arborescence
import { TeamModel } from '../../../../../../packages/infrastructure'; // ⚠️ Ajuste le chemin selon ton arborescence
import { storageService } from '../../../../modules/storage/storage.service';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const teamId = formData.get('teamId') as string | null;
    
    // 🎯 On attend bien 'bannerUrl' (et non teamCover) pour coller à ton modèle
    const imageType = formData.get('imageType') as string | null; 

    if (!file || !teamId || !imageType) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : Il manque la brindille, le userId ou le imageType.' },
        { status: 400 }
      );
    }

    // 🛡️ LE BOUCLIER DES FORMATS (MIME Types) `<(:<Ô>:)>`
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedMediaTypes = ['audio/mpeg', 'audio/mp3', 'video/mp4']; // Pour le futur !

    // Logique conditionnelle selon ce que l'on upload
    if (imageType === 'avatarUrl' || imageType === 'bannerUrl') {
      if (!allowedImageTypes.includes(file.type)) {
        return NextResponse.json(
          { success: false, message: `Ineptie de format : La Silice attend une image, pas un fichier de type ${file.type}.` },
          { status: 400 }
        );
      }
    } 
    // Quand tu créeras des champs pour tes sons et vidéos (ex: 'projectPresentationVideo')
    else if (imageType === 'mediaAttachment') {
      if (!allowedMediaTypes.includes(file.type)) {
         return NextResponse.json(
          { success: false, message: `Ineptie de format : Seuls les MP3 et MP4 sont tolérés ici.` },
          { status: 400 }
        );
      }
    }

    // ⚖️ LE BOUCLIER DE POIDS (Optionnel mais vital pour les vidéos !)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo en octets (à ajuster selon tes besoins)
    if (file.size > MAX_FILE_SIZE) {
       return NextResponse.json(
          { success: false, message: `La brindille est trop lourde ! Le Nexus limite la charge à 5 Mo.` },
          { status: 400 }
       );
    }

    // 🛡️ SÉCURITÉ ALIGNÉE SUR LE MODÈLE
    if (imageType !== 'avatarUrl' && imageType !== 'bannerUrl') {
        return NextResponse.json(
            { success: false, message: 'Type d\'image invalide (attendu: avatarUrl ou bannerUrl).' },
            { status: 400 }
        );
    }

    // --- 1. UPLOAD VERS CLOUDFLARE R2 ---
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const safeFilename = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    // La clef est générée pour garder ton bucket parfaitement organisé
    const customKey = storageService.generateStructuredKey({
        inceptId: 'tom-hat-toes',
        locale: 'fr',
        entityType: 'teams',
        entityId: teamId,
        imageType: imageType,
        filename: file.name
    });

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: customKey,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${customKey}`;

    // --- 2. LA SUTURE BASE DE DONNÉES (MongoDB) ---
    // On éveille la matrice via ton fichier de connexion mis en cache
    await connectToDatabase();

    // ⚡ L'écriture MongoDB ! Ton moteur de synchro "UP" prendra le relais vers Neo4j.
    const updatedTeam = await TeamModel.findOneAndUpdate(
        { uid: teamId }, // On cherche via l'UID Zod/Neo4j
        { [imageType]: publicUrl }, 
        { new: true } 
    );

    if (!updatedTeam) {
        return NextResponse.json(
            { success: false, message: "L'équipe spécifiée est introuvable dans le Nexus." },
            { status: 404 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        message: `La brindille a été scellée dans R2 et rattachée à l'équipe ${teamId} en tant que ${imageType}.`,
        publicUrl: publicUrl,
        team: updatedTeam.name
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Ineptitude technique :", error);
    return NextResponse.json(
      { success: false, message: "Le chaos a frappé la matrice d'upload." },
      { status: 500 }
    );
  }
}