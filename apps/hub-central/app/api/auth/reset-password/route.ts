import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase, UserModel } from "@ilot/infrastructure";
import { ResetPasswordSchema } from "@ilot/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🛡️ Validation via le schéma Zod (vérifie token, password et confirmPassword)
    const validation = ResetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides ou mots de passe non identiques." }, 
        { status: 400 }
      );
    }

    const { token, password } = validation.data;
    await connectToDatabase();

    // 🔨 1. Jambonisage : On hache manuellement car le modèle User ne le fait pas
    const hashedPassword = await bcrypt.hash(password, 12);

    // 🚀 2. On utilise findOneAndUpdate pour l'atomicité (Trouve, Change et Nettoie d'un coup)
    const user = await UserModel.findOneAndUpdate(
      { 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
      },
      { 
        $set: { password: hashedPassword },
        // 🔥 On supprime les traces du token pour qu'il ne soit plus utilisable
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" } 
      },
      { new: true }
    );

    if (!user) {
      console.warn("❌ [RESET] Tentative de forge échouée (token invalide ou expiré)");
      return NextResponse.json(
        { error: "Le lien de récupération est invalide ou a expiré." }, 
        { status: 400 }
      );
    }

    console.log(`✅ [RESET] Nouvelle clé scellée pour l'oiseau : ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: "Ta nouvelle clé est scellée. Bon vol !" 
    });

  } catch (error) {
    console.error("🚨 [RESET ERROR]", error);
    return NextResponse.json(
      { error: "La forge a surchauffé. Réessaie plus tard." }, 
      { status: 500 }
    );
  }
}