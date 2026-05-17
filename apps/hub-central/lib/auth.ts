// apps/hub-central/lib/auth.ts
import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase, OiseauModel } from "@ilot/infrastructure"; 

/**
 * 🛡️ HARMONISATION GLOBALE DES TYPES
 * On aligne les déclarations sur le schéma le plus strict pour éviter 
 * l'erreur des "identical modifiers". L'Oiseau doit être complet.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uid: string;
      signature: string;
      capabilities: string[]; // Suture de l'aura
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    uid: string;
    signature: string;
    capabilities: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    uid: string;
    signature: string;
    capabilities: string[];
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, 
  },
  providers: [
    CredentialsProvider({
      name: "L'Îlot Zoizos",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Identifiants manquants.");
        }

        await connectToDatabase();

        // On s'assure de récupérer les champs nécessaires, y compris les capacités
        const user = await OiseauModel.findOne({ 
          email: credentials.email.toLowerCase() 
        }).select("+password");

        if (!user) {
          throw new Error("Cet oiseau n'a pas encore de nid ici.");
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password as string);

        if (!isPasswordMatch) {
          throw new Error("Chant incorrect.");
        }

        console.log(`🦅 [Auth] Identification réussie : ${user.pseudo || user.username}`);

        // 🛡️ RETOUR SUTURÉ : On fournit TOUS les champs requis par l'interface User
        return {
          id: user._id.toString(),
          uid: user.uid, 
          email: user.email,
          name: user.pseudo,
          signature: user.sanctuaire?.signature || "<(:<",
          // 🛡️ SUTURE : On cherche capabilities, et si vide, on bascule sur aura
          capabilities: (user.capabilities && user.capabilities.length > 0) 
            ? user.capabilities 
            : (user.aura && user.aura.length > 0 ? user.aura : []), 
        };
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // On stocke l'ID dans le jeton
        token.uid = user.uid;
        token.signature = user.signature; // 🪡 SUTURE : On n'abandonne pas la signature lors du transit dans le jeton
        token.capabilities = user.capabilities;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        // 🛡️ SUTURE CRUCIALE : On injecte l'id du token dans la session
        session.user.id = token.id as string; 
        session.user.uid = token.uid as string;
        session.user.signature = token.signature as string; // 🪡 SUTURE : La signature se propage jusqu'au front-end
        session.user.capabilities = (token.capabilities as string[]) || [];
      }
      return session;
    },
  },
  
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};