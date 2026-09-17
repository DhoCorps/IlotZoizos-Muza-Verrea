export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { compare } from 'bcryptjs';
import { withSilice, ApiContext, handleRouteError } from '@/lib/api-guards';
import { IOiseau } from '@ilot/types';
import { z } from 'zod';

// 🛡️ Zod Schema : Validation stricte des identifiants de connexion
const LoginSchema = z.object({
  email: z.string().email("L'onde email est invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

// ==========================================
// 🔑 POST : Authentification d'un Oiseau (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Flux d'identification illisible." }, { status: 400 });
    }

    // 🛡️ Validation Zod (remplace les vérifications manuelles)
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map(issue => issue.message).join(" ");
      return NextResponse.json(
        { success: false, error: errorMessages }, 
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Recherche de l'Oiseau par email avec inclusion explicite du mot de passe
    const oiseau = await OiseauModel.findOne({ email }).select('+password').lean() as unknown as (IOiseau & { password?: string }) | null;
    
    if (!oiseau || !oiseau.password) {
      return NextResponse.json({ success: false, error: "Fréquence inconnue ou clé invalide." }, { status: 401 });
    }

    // Vérification de la signature (mot de passe)
    const isPasswordValid = await compare(password, oiseau.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: "Fréquence inconnue ou clé invalide." }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: "Connexion établie. Bienvenue dans l'Îlot.",
      user: {
        uid: oiseau.uid,
        pseudo: oiseau.pseudo,
        email: oiseau.email
      }
    }, { status: 200 });

  } catch (error: unknown) {
    // 🛡️ Utilisation du gestionnaire d'erreur global (zéro 'any')
    return handleRouteError(error, "La forge a surchauffé. Réessaie plus tard.");
  }
});