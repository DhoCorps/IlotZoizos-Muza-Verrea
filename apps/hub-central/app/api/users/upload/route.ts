// apps/hub-central/app/api/users/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase, OiseauModel, getNeo4jSession } from '@ilot/infrastructure'; 
import { storageService } from '../../../../modules/storage/storage.service';
import { authOptions } from "../../../../lib/auth"; // 🪡 SUTURE : Activation obligatoire de la clé de décodage des sessions
import { IOiseau } from '@ilot/types'; // 🪡 SUTURE : Importation du type souverain pour le cast de déblocage

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase(); // Assurer l'éveil de la Silice dès l'entrée

    // 🛡️ DOUANE ABSOLUE : Seul un Oiseau identifié peut changer d'apparence
    const session = await getServerSession(authOptions); // 🪡 SUTURE : Injection des options d'authentification
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
    
    // 🪡 PURGE : On ignore totalement le formData.get('userId'). 
    // L'Oiseau ne peut modifier que lui-même.

    // 1. Validation des présences
    if (!file || !imageType) {
      return NextResponse.json(
        { success: false, message: 'Maladresse : Il manque la brindille ou le imageType.' },
        { status: 400 }
      );
    }

    // 2. Le Bouclier des Types (Modèle User harmonisé)
    const allowedTypes = ['avatarUrl', 'coverPicture']; // 🪡 SUTURE : Retrait de profilePicture (doublon fantôme d'avatarUrl)
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
    // 🪡 SUTURE DE SOUVERAINTÉ : Cast forcé et explicite en IOiseau pour éteindre définitivement la friction de type
    const updatedUser = (await OiseauModel.findOneAndUpdate(
        { uid: userUid }, 
        { [imageType]: publicUrl }, 
        { new: true } 
    ).lean()) as unknown as IOiseau | null;

    if (!updatedUser) {
        return NextResponse.json(
            { success: false, message: "Le Zoizo est introuvable dans la matrice." },
            { status: 404 }
        );
    }

    // 🕸️ 6. PROPAGATION DANS LE GRAPHE (Neo4j)
    // On s'assure que si c'est l'avatar (avatarUrl), le nœud User met à jour sa propriété d'affichage globale
    // 🪡 SUTURE ALIGNÉE : Déplacée AVANT le return final pour éviter que le code ne devienne mort/inaccessible
    if (imageType === 'avatarUrl') {
      const neoSession = getNeo4jSession();
      try {
        await neoSession.run(
          `MATCH (u:User {uid: $userUid})
           SET u.avatarUrl = $publicUrl, u.updatedAt = datetime()`,
          { userUid, publicUrl }
        );
      } catch (neoError) {
        console.error("⚠️ [Neo4j] Échec mineur de propagation esthétique sur le nœud User :", neoError);
        // On ne bloque pas la réponse HTTP si le Graphe a eu une micro-interférence graphique
      } finally {
        // 🪡 SUTURE : Fermeture garantie de la session
        await neoSession.close();
      }
    }

    // --- 7. LE RETOUR DE HARMONIE ---
    return NextResponse.json(
      {
        success: true,
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