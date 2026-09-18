import { redirect } from 'next/navigation';
import { GameClientLauncher } from '@/apps/web/components/GameClientLauncher';
import { decideAccess } from '@/packages/auth/src/authorization';
import { getCurrentViewer } from '@/packages/auth/src/server';

export default async function GamePage() {
  const viewer = await getCurrentViewer();
  if (decideAccess('game', viewer) !== 'allow') redirect('/?auth=required');
  return <GameClientLauncher />;
}
