export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauOrchestrator } from '@ilot/shared-core';
import { revalidateTag } from 'next/cache';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IOiseau } from '@ilot/types';
import { z } from 'zod';

// 🛡️ Zod Schema : Validation stricte des données d'entrée
const RegisterSchema = z.object({
  email: z.string().email("L'onde email est invalide."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  pseudo: z.string().min(2, "Le pseudo est trop court."),
  frequenceHEX: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i, "Couleur hexadécimale invalide.").optional(),
});

// ==========================================
// 🕊️ POST : Accueillir un nouvel Oiseau (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, message: "Flux d'inscription illisible." }, { status: 400 });
    }

    // 🛡️ Validation Zod
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      // 🎯 CORRECTION : Utilisation de `issues` pour garantir la compatibilité TypeScript
      const errorMessages = parsed.error.issues.map(issue => issue.message).join(" ");
      return NextResponse.json(
        { success: false, message: errorMessages }, 
        { status: 400 }
      );
    }

    const { email, password, pseudo, frequenceHEX } = parsed.data;

    const oiseauOrch = new OiseauOrchestrator();

    // 🚀 Création de l'Oiseau via l'orchestrateur
    const syncResult = await oiseauOrch.fosterOiseau({
      email,
      password,
      pseudo,
      frequenceHEX: frequenceHEX || '#2F4F4F',
    });

    const nouvelOiseau = syncResult.mongo as IOiseau;

    // 💥 Invalidation chirurgicale du cache
    revalidateTag('oiseaux');

    return NextResponse.json({
      success: true,
      message: "L'oiseau a rejoint l'Îlot !",
      oiseau: { 
        uid: nouvelOiseau.uid,
        pseudo: nouvelOiseau.pseudo, 
        frequence: nouvelOiseau.frequenceHEX 
      }
    }, { status: 201 });

  } catch (error: unknown) {
    return handleRouteError(error, "Caprice au seuil (Inscription)");
  }
});