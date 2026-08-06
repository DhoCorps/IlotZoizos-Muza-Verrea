import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { redirect } from 'next/navigation';
import { OnboardingWizard } from '../../../../components/onboarding/OnBoardingWizard';

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/login');
  }

  return <OnboardingWizard />;
}