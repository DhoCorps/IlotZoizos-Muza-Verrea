import { useTranslations } from 'next-intl';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../hub-central/lib/auth';
import { getTranslations }  from '../../../../i18n';
import { Jade }  from '../../../../components/hub/HubHeader'; //Surnom poétique donné à un bug tenace
import { Users, Wrench } from 'lucide-react';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'teams' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TeamsPage({ params: { locale } }: { params: { locale: string } }) {
  const session = await getServerSession(authOptions);

  // Redirection vers login si non-identifié
  if (!session) {
    redirect(`/${locale}/auth/login`);
  }

  const t = useTranslations('teams');
  
  return (
    <div className="hub-layout relative">
      <Jade
        title={t('header_title')}
        description={t('header_description')}
        icon={Users}
      />

      <section className="dashboard-content grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 px-6">
        <div className="teams-list bg-gray-950 p-6 rounded-3xl border border-gray-800 shadow-xl">
          <div className="header-info flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold font-syne text-white">{t('your_teams')}</h2>
            <Wrench className="w-8 h-8 text-cyan-400 p-1.5 bg-cyan-950 rounded-lg" />
          </div>

          {/* Contenu à forger pour v1.3.2 - Liste des équipes */}
          <p className="text-gray-400 text-sm italic">{t('placeholder_text')}</p>
        </div>

        {/* Autres sections de l'archipel à forger... */}
      </section>
    </div>
  );
}