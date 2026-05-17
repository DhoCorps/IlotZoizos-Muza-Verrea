// apps/hub-central/types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Étendre la session pour inclure l'aura (capabilities) et l'UID
   */
  interface Session {
    user: {
      id: string;
      uid: string;
      capabilities: string[];
    } & DefaultSession["user"]
  }

  /**
   * Étendre l'utilisateur pour le JWT et le callback session
   */
  interface User {
    id: string;
    uid: string;
    capabilities: string[];
  }
}

declare module "next-auth/jwt" {
  /**
   * Étendre le JWT pour transporter les capacités dans le tunnel
   */
  interface JWT {
    id: string;
    uid: string;
    capabilities: string[];
  }
}