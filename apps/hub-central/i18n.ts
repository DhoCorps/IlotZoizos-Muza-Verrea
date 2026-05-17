// apps/hub-central/i18n.ts
import { getRequestConfig, getTranslations } from 'next-intl/server';

/**
 * Configuration multilingue du v1.3.1
 * Centralisation des membres pour le Nexus de traduction
 */
export const locales = ['fr', 'en'] as const;
export const defaultLocale = 'fr';
export const localePrefix = 'always';

export { getTranslations };

export default getRequestConfig(async ({ requestLocale }) => {
  // 🛡️ SUTURE : On attend la locale comme exigé par les nouvelles versions
  const locale = await requestLocale;
  
  // On valide la locale ou on replie sur le défaut pour éviter tout crash
  const targetLocale = locales.includes(locale as any) ? locale : defaultLocale;
  
  return {
    locale: targetLocale,
    messages: (await import(`./dictionaries/${targetLocale}.json`)).default
  };
});