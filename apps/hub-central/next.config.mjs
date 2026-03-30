import createNextIntlPlugin from 'next-intl/plugin';

// On indique où se trouve le fichier de configuration qu'on vient de créer
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // On garde précieusement tes transpilations pour le monorepo
  transpilePackages: ['@ilot/shared-core', '@ilot/types', '@ilot/infrastructure', '@ilot/config'],
};

// On enveloppe ta configuration avec le plugin multilingue
export default withNextIntl(nextConfig);