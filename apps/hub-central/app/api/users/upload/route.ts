// apps/hub-central/app/api/users/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, UserModel } from '../../../../../../packages/infrastructure'; 
import { storageService } from '../../../../modules/storage/storage.service';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const imageType = formData.get('imageType') as string | null; 

    // 1. Validation des présences
    if (!file || !userId || !imageType) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : Il manque la brindille, le userId ou le imageType.' },
        { status: 400 }
      );
    }

    // 2. Le Bouclier des Types (Modèle User)
    const allowedTypes = ['avatarUrl', 'profilePicture', 'coverPicture'];
    if (!allowedTypes.includes(imageType)) {
        return NextResponse.json(
            { success: false, message: `Type d'image invalide (attendu: ${allowedTypes.join(', ')}).` },
            { status: 400 }
        );
    }

    // 3. Le Bouclier des Formats & Poids
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: `Ineptie : La Silice attend une image, pas du ${file.type}.` },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
       return NextResponse.json(
          { success: false, message: `La brindille est trop lourde (Max 5 Mo).` },
          { status: 400 }
       );
    }

    // --- 4. L'ALCHIMIE DU STORAGE (Via Service) ---
    const customKey = storageService.generateStructuredKey({
        inceptId: 'tom-hat-toes',
        locale: 'fr',
        entityType: 'users',
        entityId: userId,
        imageType: imageType,
        filename: file.name
    });

    // On laisse le service faire tout le travail S3/R2
    const uploadResult = await storageService.uploadFile(file, customKey);
    const publicUrl = uploadResult.publicUrl;

    // --- 5. LA SUTURE BASE DE DONNÉES (MongoDB) ---
    await connectToDatabase();

    const updatedUser = await UserModel.findOneAndUpdate(
        { uid: userId }, 
        { [imageType]: publicUrl }, 
        { new: true } 
    );

    if (!updatedUser) {
        return NextResponse.json(
            { success: false, message: "Le Zozio est introuvable dans la matrice." },
            { status: 404 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Ancrage réussi pour ${updatedUser.username} !`,
        publicUrl: publicUrl,
        user: updatedUser.username
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