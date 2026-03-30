import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase, UserModel } from "@ilot/infrastructure"; 

/**
 * 💡 SUTURE FINALE DES TYPES
 * On utilise exactement les types optionnels (?) demandés par le compilateur
 * pour fusionner parfaitement avec les déclarations précédentes.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      uid?: string;
      role?: string;
      signature?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    uid?: string;
    role?: string;
    signature?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    uid?: string;
    role?: string;
    signature?: string;
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

        const user = await UserModel.findOne({ 
          email: credentials.email.toLowerCase() 
        }).select("+password");

        if (!user) {
          throw new Error("Cet oiseau n'a pas encore de nid ici.");
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password as string);

        if (!isPasswordMatch) {
          throw new Error("Chant incorrect.");
        }

        console.log(`🦅 [Auth] Identification réussie pour l'oiseau : ${user.username}`);

        return {
          id: user._id.toString(),
          uid: user.uid || user._id.toString(), // On garantit l'UID
          email: user.email,
          name: user.username,
          role: user.role,
          signature: user.signature || "<(:<",
        };
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 🛡️ Le 'user' n'est présent qu'au moment du login initial
      if (user) {
        token.id = user.id;
        token.uid = user.uid;
        token.role = user.role;
        token.signature = user.signature;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // 🛡️ On s'assure de ne jamais écraser avec du vide
        session.user.id = token.id as string;
        session.user.uid = token.uid as string;
        session.user.role = token.role as string;
        session.user.signature = token.signature as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};