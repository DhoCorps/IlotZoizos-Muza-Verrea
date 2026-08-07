import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // 👈 Vérifie que le chemin pointe bien vers ton fichier auth.ts

// NextAuth crée le gestionnaire (handler) en utilisant tes options parfaites
const handler = NextAuth(authOptions);

// On exporte ce gestionnaire pour les requêtes GET et POST
export { handler as GET, handler as POST };