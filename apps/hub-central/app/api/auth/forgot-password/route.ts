export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { OiseauModel } from "@ilot/infrastructure";
import { ForgotPasswordSchema } from "@ilot/types";
import { revalidateTag } from "next/cache";
import { withSilice, ApiContext, handleRouteError } from "@/lib/api-guards";

// ==========================================
// 🗺️ POST : Envoyer la fusée de détresse / Réinitialisation (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("❌ [RESEND] Erreur : La clé API est absente du fichier .env");
      return NextResponse.json({ success: false, error: "Configuration email défaillante." }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Format de requête invalide." }, { status: 400 });
    }

    const validation = ForgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errorMessages = validation.error.issues.map(issue => issue.message).join(" ");
      return NextResponse.json({ success: false, error: errorMessages || "Email invalide." }, { status: 400 });
    }

    const { email } = validation.data;

    const user = await OiseauModel.findOne({ email });
    
    // 🛡️ Sécurité : On ne révèle pas si l'email existe ou non pour éviter l'énumération d'utilisateurs
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 2. Génération du Token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 heure

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // 💥 Invalidation chirurgicale du cache utilisateur
    revalidateTag('oiseaux');
    revalidateTag(`oiseau-${user.uid}`);

    // 3. Configuration de l'expéditeur
    const resend = new Resend(apiKey);
    const locale = "fr"; 
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${locale}/auth/reset-password?token=${resetToken}`;
    
    const fromAddress = process.env.NODE_ENV === "production" 
      ? "L'Îlot Zoizos <bonjour@ton-domaine.com>" 
      : "L'Îlot Zoizos <onboarding@resend.dev>";

    // 4. Envoi de l'email via Resend
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "🗺️ Retrouve ton chemin vers l'Îlot",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #020617; background-color: #f8fafc;">
          <h2 style="color: #E5484D;">Appel de Détresse reçu !</h2>
          <p>Un oiseau nous a dit que tu avais oublié ton mot de passe secret.</p>
          <p>Clique sur le bouton ci-dessous pour forger une nouvelle clé. Ce lien s'autodétruira dans 1 heure.</p>
          <div style="margin-top: 25px;">
            <a href="${resetUrl}" style="background-color: #E5484D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Renouveler mon mot de passe
            </a>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Signature de l'Architecte : <(:< </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ [RESEND ERROR]", error);
      return NextResponse.json({ success: false, error: "La tempête a empêché l'envoi du message." }, { status: 500 });
    }

    console.log(`✉️ [RESEND] Fusée de détresse envoyée à ${email} (ID: ${data?.id})`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: unknown) {
    // 🛡️ Utilisation du gestionnaire d'erreur global (zéro 'any')
    return handleRouteError(error, "La tempête a empêché l'envoi du message.");
  }
});