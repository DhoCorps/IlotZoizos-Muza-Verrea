// apps/hub-central/app/[locale]/(inceptions)/dashboard/wellbeing/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { redirect } from 'next/navigation';
import { WellbeingSanctuary } from '@/components/dashboard/WellBeingSanctuary';

export default async function WellbeingPage() {
    const session = await getServerSession(authOptions);
    
    // Protection d'accès de base
    if (!session?.user) {
        redirect('/auth/login');
    }

    return <WellbeingSanctuary />;
}