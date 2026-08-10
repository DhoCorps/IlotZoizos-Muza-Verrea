import { NextAuthOptions, DefaultSession, DefaultUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectToDatabase, OiseauModel, OiseauInventoryModel, franchirLaPorte } from "@ilot/infrastructure"; 

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
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  providers: [
    CredentialsProvider({
      name: "L'Îlot Zoizos",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(credentials): Promise<any> {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Identifiants manquants.");
          }

          // 1. Connexion à la Silice (MongoDB)
          await connectToDatabase();

          // On s'assure de récupérer les champs nécessaires, y compris le mot de passe et les capacités
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

          // 2. 🌿 L'ALVÉOLE DE L'OISEAU (Vérification et Initialisation du Portefeuille)
          try {
            let alveole = await OiseauInventoryModel.findOne({ ownerUid: user.uid });
            if (!alveole) {
              await OiseauInventoryModel.create({
                ownerUid: user.uid,
                email: user.email,
                brindilles: 100, // Pécule de départ de ressources
                parchemins: 10,
                inventaireElements: {
                  essenceVent: 10,
                  gluonFeu: 5,
                  atomeAir: 5,
                  oceanNeant: 1,
                },
                createdAt: new Date(),
              });
              console.log(`🌿 [Auth] Alvéole créée pour ${user.pseudo || user.username} avec le pécule initial.`);
            }
          } catch (inventoryError) {
            console.error(`🔥 [Auth] Erreur lors de la synchronisation de l'Alvéole (Non-bloquant):`, inventoryError);
          }

          // 3. 🌟 L'ÉCHO NEO4J (SÉCURISÉ & NON-BLOQUANT)
          try {
            franchirLaPorte({
              uid: user.uid,
              pseudo: user.pseudo || user.username,
              frequenceHEX: user.frequenceHEX
            }).then(() => {
              console.log(`✨ [Auth] ${user.pseudo || user.username} a franchi la porte Neo4j en tâche de fond.`);
            }).catch((graphError: unknown) => {
              console.error(`🔥 [Auth] Erreur de résonance Neo4j (Non-bloquant):`, graphError);
            });
          } catch (graphSyncError: unknown) {
            console.error(`🔥 [Auth] Erreur synchrone inattendue au lancement de Neo4j:`, graphSyncError);
          }

          // 🛡️ RETOUR SUTURÉ : On fournit TOUS les champs requis par l'interface User
          return {
            id: user._id.toString(),
            uid: user.uid, 
            email: user.email,
            name: user.pseudo || user.username,
            signature: user.sanctuaire?.signature || user.signature || "<(:<",
            capabilities: (user.capabilities && user.capabilities.length > 0) 
              ? user.capabilities 
              : (user.aura && user.aura.length > 0 ? user.aura : []), 
          };
        } catch (error: unknown) {
          const errMessage = error instanceof Error ? error.message : "Erreur lors de l'authentification.";
          console.error("🔥 [AUTH ERROR]", errMessage);
          throw new Error(errMessage);
        }
      }
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      try {
        if (user) {
          token.id = user.id;
          token.uid = user.uid;
          token.signature = user.signature; 
          token.capabilities = user.capabilities;
        }

        if (trigger === "update" && session?.capabilities) {
          token.capabilities = session.capabilities;
        } 
      } catch (error) {
        console.error("🔥 [JWT CALLBACK ERROR]", error);
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.id = token.id as string; 
          session.user.uid = token.uid as string;
          session.user.signature = token.signature as string; 
          session.user.capabilities = (token.capabilities as string[]) || [];
        }
      } catch (error) {
        console.error("🔥 [SESSION CALLBACK ERROR]", error);
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};