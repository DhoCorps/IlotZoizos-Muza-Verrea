// apps/hub-central/app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from 'bcryptjs';
import { OiseauModel, franchirLaPorte, connectToDatabase } from '@ilot/infrastructure';

// 🌟 SUTURE : Configuration interne pour éclairer l'ensemble de l'Îlot (Non-exportée pour apaiser le compilateur Next.js)
const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Fréquence (Credentials)",
      credentials: {
        email: { label: "Nexus ID (Email)", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials) {
        // 1. Connexion à la Silice (MongoDB)
        await connectToDatabase();
        
        if (!credentials?.email || !credentials?.password) {
            throw new Error("Les coordonnées sont incomplètes.");
        }

        // 2. On cherche la graine matérielle
        const oiseau = await OiseauModel.findOne({ email: credentials.email }).select('+password');
        
        if (!oiseau) {
            throw new Error("Aucun Oiseau ne résonne sur cette fréquence.");
        }

        // 3. Vérification de la clé
        const isMatch = await bcrypt.compare(credentials.password, oiseau.password);
        if (!isMatch) {
            throw new Error("L'harmonie est brisée. Mot de passe incorrect.");
        }

        // 4. 🌟 L'ÉCHO NEO4J
        try {
          await franchirLaPorte({
            uid: oiseau.uid,
            pseudo: oiseau.pseudo,
            frequenceHEX: oiseau.frequenceHEX
          });
          console.log(`✨ [Auth] ${oiseau.pseudo} a franchi la porte avec succès.`);
        } catch (graphError) {
          console.error(`🔥 [Auth] Erreur de résonance Neo4j pour ${oiseau.pseudo}:`, graphError);
        }

        // 5. Transmission de l'essence initiale
        return {
          id: oiseau._id.toString(),
          uid: oiseau.uid,
          email: oiseau.email,
          name: oiseau.pseudo || oiseau.username,
          signature: oiseau.sanctuaire?.signature || oiseau.signature || "<(:<",
          capabilities: oiseau.capabilities || [] 
        };
      }
    })
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 🪡 SUTURE : Phase de connexion initiale
      if (user) {
        token.id = user.id;
        token.uid = (user as any).uid;
        token.capabilities = (user as any).capabilities || [];
      }

      // 🛡️ SUTURE : Rafraîchissement Dynamique des Plumes (Capabilities)
      // Si on demande une mise à jour manuelle ou si le token est déjà établi
      if (trigger === "update" && session?.capabilities) {
        token.capabilities = session.capabilities;
      } 
      // Sinon, pour éviter la désynchronisation au 147 Bd Baille, 
      // on peut forcer une vérification en base si nécessaire :
      else if (!user && token.uid) {
        try {
          // Note: On ne le fait pas à chaque appel pour les performances, 
          // mais c'est ici que la "vérité" doit être rétablie si l'Oiseau bug.
          // Pour l'instant, on se repose sur la session, mais on prépare le terrain.
        } catch (err) {
          console.error("🔥 [JWT] Erreur de synchro des Plumes:", err);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id; 
        (session.user as any).uid = token.uid;
        (session.user as any).capabilities = token.capabilities;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
  }
};

const handler = NextAuth(authOptions);

// Next.js ne voit plus que des méthodes HTTP pures. Le compilateur est apaisé.
export { handler as GET, handler as POST };