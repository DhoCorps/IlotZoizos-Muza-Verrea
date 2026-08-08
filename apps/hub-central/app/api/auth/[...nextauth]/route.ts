export const dynamic = 'force-dynamic';

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { withSilice } from "@/lib/api-guards";

// Le gestionnaire NextAuth est encapsulé dans une logique "Silice" 
// pour garantir que la base de données est prête pour les adaptateurs (ex: MongoDB)
const handler = NextAuth(authOptions);

// On harmonise l'exportation avec nos standards tout en conservant 
// la compatibilité requise par NextAuth (GET et POST)
const protectedHandler = withSilice(async (req: Request, _context: any) => {
    // Si c'est une requête NextAuth, on délègue au handler original
    return await handler(req as any);
});

export { protectedHandler as GET, protectedHandler as POST };