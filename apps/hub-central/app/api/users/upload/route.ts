// apps/hub-central/app/api/users/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel } from '@ilot/infrastructure'; 
import { storageService } from '../../../../modules/storage/storage.service';
// import { authOptions } from "../../../lib/auth"; // Décommente si nécessaire

export async function POST(req: NextRequest) {
  try {
    // 🛡️ DOUANE ABSOLUE : Seul un Oiseau identifié peut changer d'apparence
    const session = await getServerSession();
    const userUid = (session?.user as any)?.uid;

    if (!userUid) {
      return NextResponse.json(
        { success: false, message: "Le miroir est vide. Identifie-toi." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const imageType = formData.get('imageType') as string | null; 
    
    // 🩸 PURGE : On ignore totalement le formData.get('userId'). 
    // L'Oiseau ne peut modifier que lui-même.

    // 1. Validation des présences
    if (!file || !imageType) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : Il manque la brindille ou le imageType.' },
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
        entityId: userUid, // On utilise l'UID de la session, certifié inviolable !
        imageType: imageType,
        filename: file.name
    });

    const uploadResult = await storageService.uploadFile(file, customKey);
    const publicUrl = uploadResult.publicUrl;

    // --- 5. LA SUTURE BASE DE DONNÉES (MongoDB) ---
    await connectToDatabase();

    const updatedUser = await OiseauModel.findOneAndUpdate(
        { uid: userUid }, // On utilise l'UID de la session
        { [imageType]: publicUrl }, 
        { new: true } 
    );

    if (!updatedUser) {
        return NextResponse.json(
            { success: false, message: "Le Zoizo est introuvable dans la matrice." },
            { status: 404 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        // SUTURE SÉMANTIQUE : On utilise pseudo et non username
        message: `L'apparence de ${updatedUser.pseudo} a muté avec succès !`,
        publicUrl: publicUrl,
        user: updatedUser.pseudo 
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