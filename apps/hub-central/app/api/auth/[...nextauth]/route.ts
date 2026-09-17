export const dynamic = 'force-dynamic';

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSilice, ApiContext, handleRouteError } from "@/lib/api-guards";
import { NextRequest, NextResponse } from "next/server";

const handler = NextAuth(authOptions);

const protectedHandler = withSilice(async (req: NextRequest, context: ApiContext): Promise<NextResponse> => {
    try {
        // NextAuth renvoie un Response natif
        const res = await handler(req as unknown as Request);

        // On récupère les headers et le statut
        const status = res.status;
        const headers = res.headers;

        // On gère proprement le corps selon son type (JSON vs Texte/Redirection)
        const contentType = headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await res.json();
            return NextResponse.json(data, { status, headers });
        } else {
            const text = await res.text();
            return new NextResponse(text, { status, headers });
        }
    } catch (error: unknown) {
        return handleRouteError(error, "Erreur critique dans le flux d'authentification NextAuth");
    }
});

export { protectedHandler as GET, protectedHandler as POST };