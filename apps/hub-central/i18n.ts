import { getRequestConfig, getTranslations } from 'next-intl/server';

/**
 * Configuration multilingue de l'v1.3.1
 * Centralisation des membres pour le Nexus de traduction
 */
export const locales = ['fr', 'en'] as const;
export const defaultLocale = 'fr';
export const localePrefix = 'always';

// Suture de centralisation : on ré-exporte getScopedTranslations
// pour que tes composants puissent l'importer directement depuis ici.
export { getTranslations };

export default getRequestConfig(async ({ locale }) => {
  // On valide la locale ou on replie sur le défaut pour éviter tout crash
  const targetLocale = locales.includes(locale as any) ? locale : defaultLocale;
  
  return {
    locale: targetLocale,
    messages: (await import(`./dictionaries/${targetLocale}.json`)).default
  };
});