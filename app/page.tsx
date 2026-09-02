import { LandingPage } from '@/apps/web/components/public/LandingPage';
import { getPublishedUpdates } from '@/packages/updates/src/server';

interface HomeProps {
  searchParams: Promise<{ auth?: string; notice?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const [params, updates] = await Promise.all([searchParams, getPublishedUpdates(5)]);
  return <LandingPage updates={updates} authRequired={params.auth === 'required'} accessDenied={params.notice === 'admin-denied'} />;
}
