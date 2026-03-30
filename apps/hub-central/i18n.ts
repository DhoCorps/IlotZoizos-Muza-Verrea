import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Pour l'instant, l'Îlot parle français par défaut
  const locale = 'fr';
  
  return {
    locale,
    messages: (await import(`./dictionaries/${locale}.json`)).default
  };
});