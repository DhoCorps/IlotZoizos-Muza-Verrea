import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase, UserModel } from "@ilot/infrastructure";
import { ResetPasswordSchema } from "@ilot/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Données corrompues ou mot de passe trop court." }, { status: 400 });
    }

    const { token, password } = validation.data;
    await connectToDatabase();

    // 🕵️ On cherche l'oiseau. 
    // On ajoute .select("+password") par précaution si tu veux vérifier l'ancien (optionnel)
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Vérifie que c'est bien > maintenant
    });

    if (!user) {
      // Log pour l'architecte (ne pas envoyer au client pour la sécurité)
      console.log("❌ [RESET] Tentative avec un token invalide ou expiré :", token);
      return NextResponse.json(
        { error: "Ce lien est invalide ou a expiré (validité : 1h)." }, 
        { status: 400 }
      );
    }

    // 🔨 Jambonisage : Hachage de la nouvelle clé
    const hashedPassword = await bcrypt.hash(password, 12);

    // 🧹 Mise à jour et nettoyage
    user.password = hashedPassword;
    
    // On utilise undefined pour que les champs disparaissent du document (grâce au sparse: true)
    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);
    
    await user.save();

    console.log(`✅ [RESET] Nouvelle clé forgée avec succès pour ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: "Ta nouvelle clé est prête. En vol !" 
    }, { status: 200 });

  } catch (error) {
    console.error("❌ [RESET ERROR]", error);
    return NextResponse.json({ error: "La forge a surchauffé. Réessaie plus tard." }, { status: 500 });
  }
}