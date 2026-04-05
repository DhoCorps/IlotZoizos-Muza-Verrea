'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

/**
 * NextAuthProvider : La Membrane d'Identité (v1.3.1)
 * Permet à chaque plume de l'Îlot Zoizos de connaître l'état de sa session.
 */
interface Props {
  children: ReactNode;
}

export const NextAuthProvider = ({ children }: Props) => {
  return (
    <SessionProvider>
      {/* Lord Kaos est canalisé ici, l'identité devient fluide */}
      {children}
    </SessionProvider>
  );
};