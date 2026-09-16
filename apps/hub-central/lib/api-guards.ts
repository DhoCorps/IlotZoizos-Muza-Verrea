import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from '@ilot/infrastructure';
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from '@/modules/security/rateLimiter';

export interface OiseauUser {
  id: string;
  uid: string;
  slug?: string;
  capabilities: string[];
}

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