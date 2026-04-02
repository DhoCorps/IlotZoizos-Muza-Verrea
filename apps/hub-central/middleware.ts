import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const locales = ['fr', 'en'];
const defaultLocale = 'fr'; 

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;

    // 1. Analyse de la trajectoire : présence d'une locale ?
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // 2. Redirection si pas de locale (ex: /dashboard -> /fr/dashboard)
    if (!pathnameHasLocale) {
      return NextResponse.redirect(
        new URL(`/${defaultLocale}${pathname}`, req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const { pathname } = req.nextUrl;
        
        // ACCÈS PUBLIC : La racine ET tout le secteur d'authentification
        const isPublicPage = 
          pathname === '/' || 
          locales.some(l => pathname === `/${l}`) ||
          pathname.includes('/auth/'); // 🩸 LA CLÉ POUR ÉVITER LA BOUCLE INFINIE

        if (isPublicPage) return true;

        // Pour tous les autres secteurs (Dashboard, Teams, Tom-Hat-Toes), token requis.
        return !!token;
      },
    },
    pages: {
      // Point d'entrée pour les oiseaux non identifiés
      signIn: `/${defaultLocale}/auth/login`, 
    },
  }
);

export const config = {
  matcher: [
    /*
     * Le Sceau de Protection global.
     * Intercepte toutes les requêtes SAUF les API et les fichiers statiques.
     * Plus besoin de lister chaque route, le middleware trie tout seul.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};