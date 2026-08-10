export const dynamic = 'force-dynamic';

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSilice } from "@/lib/api-guards";
import { NextRequest, NextResponse } from "next/server";

const handler = NextAuth(authOptions);

const protectedHandler = withSilice(async (req: NextRequest, context: unknown): Promise<NextResponse> => {
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
        return new NextResponse(text, { status, headers }) as unknown as NextResponse;
    }
});

export { protectedHandler as GET, protectedHandler as POST };