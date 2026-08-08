export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { OiseauModel } from '@ilot/infrastructure';
import { compare } from 'bcryptjs';
import { withSilice, ApiContext } from '@/lib/api-guards';

// ==========================================
// 🔑 POST : Authentification d'un Oiseau (Public / Silice)
// ==========================================
export const POST = withSilice(async (req: Request, _context: ApiContext) => {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Flux d'identification illisible." }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "L'onde est incomplète (Email et Mot de passe requis)." }, { status: 400 });
    }

    // Recherche de l'Oiseau par email
    const oiseau = await OiseauModel.findOne({ email }).select('+password');
    if (!oiseau) {
      return NextResponse.json({ error: "Fréquence inconnue ou clé invalide." }, { status: 401 });
    }

    // Vérification de la signature (mot de passe)
    const isPasswordValid = await compare(password, oiseau.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Fréquence inconnue ou clé invalide." }, { status: 401 });
    }

    // Note: Dans une stack NextAuth, le login se fait souvent via signIn() côté client. 
    // Si tu utilises cette route pour un login custom, tu générerais un token ici.
    return NextResponse.json({
      success: true,
      message: "Connexion établie. Bienvenue dans l'Îlot.",
      user: {
        uid: oiseau.uid,
        pseudo: oiseau.pseudo,
        email: oiseau.email
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Fracture lors de la connexion :", error);
    return NextResponse.json({ error: "La forge a surchauffé. Réessaie plus tard." }, { status: 500 });
  }
});