import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from '@/modules/security/rateLimiter';
import { IlotError } from '@ilot/shared-core'; // Ajuste le chemin relatif selon ton arborescence

export interface OiseauUser {
  id: string;
  uid: string;
  slug?: string;
  capabilities: string[];
  actorUid?: string; // Rendu optionnel pour compatibilité croisée
  name?: string;     // 👈 Ajouté proprement à la source
  [key: string]: unknown; // 👈 Index signature pour absorber les extensions futures
}


export type UserSignatureLike = {
  actorUid?: string;
  uid?: string;
  capabilities: string[];
  [key: string]: unknown;
};

// 🌿 Typage strict du contexte de route Next.js (Supporte les slugs dynamiques et les routes vides)
export type ApiContext = { 
  params?: Promise<Record<string, string | string[]>> | Record<string, string | string[]> 
};

type ProtectedRouteHandler<Req> = (req: Req, context: ApiContext, currentUser: OiseauUser) => Promise<NextResponse>;
type PublicRouteHandler<Req> = (req: Req, context: ApiContext) => Promise<NextResponse>;
type OptionalRouteHandler<Req> = (req: Req, context: ApiContext, currentUser?: OiseauUser) => Promise<NextResponse>;

/**
 * 🛡️ 1. withSilice : Allume uniquement la base de données (Pour routes 100% Publiques)
 */
export function withSilice<Req>(handler: PublicRouteHandler<Req>) {
  return async (req: Req, context: ApiContext = {}) => {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }
    return await handler(req, context);
  };
}

/**
 * 🛡️ 2. withAura : Allume la base ET exige une connexion (Pour routes strictement Privées)
 */
export function withAura<Req>(handler: ProtectedRouteHandler<Req>) {
  return async (req: Req, context: ApiContext = {}) => {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("❌ [SESSION ERROR]", sessionErr);
      return NextResponse.json({ error: "Erreur de lecture d'Aura." }, { status: 500 });
    }

    const currentUser = session?.user as OiseauUser | undefined;

    if (!currentUser || !currentUser.uid) {
      return NextResponse.json({ error: "Le Nexus est invisible aux étrangers." }, { status: 401 });
    }

    return await handler(req, context, currentUser);
  };
}

/**
 * 🛡️ 3. withOptionalAura : Allume la base et lit la session SANS bloquer (Pour routes mixtes)
 */
export function withOptionalAura<Req>(handler: OptionalRouteHandler<Req>) {
  return async (req: Req, context: ApiContext = {}) => {
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.error("❌ [DB ERROR]", dbErr);
      return NextResponse.json({ error: "La Silice est injoignable." }, { status: 500 });
    }

    let session;
    try {
      session = await getServerSession(authOptions);
    } catch (sessionErr) {
      console.error("⚠️ [SESSION WARNING]", sessionErr);
    }

    const currentUser = session?.user as OiseauUser | undefined;

    return await handler(req, context, currentUser);
  };
}

/**
 * 🛡️ 4. withRateLimit : Protège une route contre les abus (ex: Uploads massifs)
 */
function getClientIp(req: NextRequest | Request): string {
  if ('headers' in req && typeof req.headers.get === 'function') {
    return req.headers.get('x-forwarded-for') || '127.0.0.1';
  }
  return '127.0.0.1';
}

export function withRateLimit<Req extends NextRequest | Request>(
  actionKey: string,
  maxRequests: number = 10,
  windowSeconds: number = 60,
  handler: ProtectedRouteHandler<Req> | PublicRouteHandler<Req>
) {
  return async (req: Req, context: ApiContext = {}, currentUser?: any) => {
    const clientIp = getClientIp(req);
    try {
      const rateLimitResult = await checkRateLimit(`${actionKey}:${clientIp}`, maxRequests, windowSeconds);
      if (rateLimitResult && rateLimitResult.allowed === false) {
        return NextResponse.json(
          { success: false, message: "Trop de requêtes. Ralentis le rythme, oiseau voyageur." }, 
          { status: 429 }
        );
      }
    } catch (err) {
      console.error("⚠️ [RATE LIMIT ERROR]", err);
    }

    return await handler(req, context, currentUser);
  };
}

/**
 * 🛡️ 5. handleRouteError : Centralise la gestion des erreurs HTTP/IlotError pour toutes les routes.
 */
export function handleRouteError(error: unknown, defaultMessage: string = "Erreur interne de la Matrice"): NextResponse {
  if (error instanceof IlotError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status } // 👈 Correction : on utilise error.status au lieu de error.statusCode
    );
  }

  const errMessage = error instanceof Error ? error.message : String(error);
  console.error(`🔥 [API Guard Fatal] ${defaultMessage} :`, errMessage);

  return NextResponse.json(
    { success: false, error: defaultMessage },
    { status: 500 }
  );
}

/**
 * 🔒 6. assertEntitySovereignty : Valide la souveraineté d'un utilisateur sur une entité (Bouclier Anti-IDOR).
 * Compatible avec les objets de session (`currentUser.uid`) et les signatures d'action (`actorUid`).
 */
export function assertEntitySovereignty(currentUser: UserSignatureLike, entityOwnerUid: string): void {
  if (!currentUser || (!currentUser.actorUid && !currentUser.uid)) {
    throw new IlotError("Oiseau non authentifié.", "UNAUTHORIZED", 401);
  }

  const userIdentifier = currentUser.actorUid || currentUser.uid;
  const isOwner = userIdentifier === entityOwnerUid;
  const isArchitect = Array.isArray(currentUser.capabilities) && currentUser.capabilities.includes('*');

  if (!isOwner && !isArchitect) {
    throw new IlotError("Souveraineté violée : Accès interdit à ce territoire.", "FORBIDDEN", 403);
  }
}