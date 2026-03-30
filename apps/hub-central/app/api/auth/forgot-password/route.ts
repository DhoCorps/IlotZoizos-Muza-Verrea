import { NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { connectToDatabase, UserModel } from "@ilot/infrastructure";
import { ForgotPasswordSchema } from "@ilot/types";

export async function POST(req: Request) {
  try {
    // 🛡️ 1. Vérification de la clé API avant toute chose
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("❌ [RESEND] Erreur : La clé API est absente du fichier .env");
      throw new Error("Missing API key");
    }

    const resend = new Resend(apiKey);
    const body = await req.json();
    const validation = ForgotPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    const { email } = validation.data;
    await connectToDatabase();

    const user = await UserModel.findOne({ email });
    
    // 🕵️ Sécurité : On ne confirme pas si l'email existe ou non pour éviter le "scraping"
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // 2. Génération du Token (valable 1 heure)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // 3. Configuration de l'URL et de l'expéditeur
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;
    
    // ⚠️ IMPORTANT : Si tu n'as pas de domaine vérifié, utilise l'adresse de test obligatoire
    const fromAddress = process.env.NODE_ENV === "production" 
      ? "L'Îlot Zoizos <bonjour@ton-domaine.com>" 
      : "L'Îlot Zoizos <onboarding@resend.dev>";

    // 4. Envoi de l'email
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: email,
      subject: "🗺️ Retrouve ton chemin vers l'Îlot",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #020617; background-color: #f8fafc;">
          <h2 style="color: #10b981;">Appel de Détresse reçu !</h2>
          <p>Un oiseau nous a dit que tu avais oublié ton mot de passe secret.</p>
          <p>Clique sur le bouton ci-dessous pour forger une nouvelle clé. Ce lien s'autodétruira dans 1 heure.</p>
          <div style="margin-top: 25px;">
            <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Renouveler mon mot de passe
            </a>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Signature de l'Architecte : <(:< </p>
        </div>
      `,
    });

    if (error) {
      console.error("❌ [RESEND ERROR]", error);
      throw error;
    }

    console.log(`✉️ [RESEND] Fusée de détresse envoyée à ${email} (ID: ${data?.id})`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error("❌ [FORGOT PASSWORD ERROR]", error);
    return NextResponse.json({ error: "La tempête a empêché l'envoi du message." }, { status: 500 });
  }
}