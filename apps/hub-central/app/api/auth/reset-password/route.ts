export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { OiseauModel } from "@ilot/infrastructure";
import { ResetPasswordSchema } from "@ilot/types";
import { revalidateTag } from "next/cache";
import { withSilice, ApiContext } from "@/lib/api-guards";

// ==========================================
// 🛡️ POST : Sceller une nouvelle clé (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Flux illisible." }, { status: 400 });
    }
    
    // 🛡️ Validation stricte via Zod
    const validation = ResetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Données invalides ou mots de passe non identiques." }, 
        { status: 400 }
      );
    }

    const { token, password } = validation.data;

    // 🔨 Jambonisage : Hachage de la nouvelle clé
    const hashedPassword = await bcrypt.hash(password, 12);

    // 🚀 Mise à jour atomique : Trouve, Change et Nettoie d'un coup
    const user = await OiseauModel.findOneAndUpdate(
      { 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
      },
      { 
        $set: { password: hashedPassword },
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

    // 💥 Invalidation chirurgicale du cache utilisateur
    revalidateTag('oiseaux');
    revalidateTag(`oiseau-${user.uid}`);

    console.log(`✅ [RESET] Nouvelle clé scellée pour l'oiseau : ${user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: "Ta nouvelle clé est scellée. Bon vol !" 
    });

  } catch (error: any) {
    console.error("🚨 [RESET ERROR]", error);
    return NextResponse.json(
      { error: "La forge a surchauffé. Réessaie plus tard." }, 
      { status: 500 }
    );
  }
});