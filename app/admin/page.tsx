import { redirect } from 'next/navigation';
import { AdminPanel } from '@/apps/web/components/admin/AdminPanel';
import { decideAccess } from '@/packages/auth/src/authorization';
import { getCurrentViewer } from '@/packages/auth/src/server';
import { getAllUpdatesForAdmin } from '@/packages/updates/src/server';

export default async function AdminPage() {
  const viewer = await getCurrentViewer();
  const decision = decideAccess('admin', viewer);
  if (decision === 'login-required') redirect('/?auth=required');
  if (decision === 'forbidden') redirect('/?notice=admin-denied');
  const updates = await getAllUpdatesForAdmin();
  return <AdminPanel initialUpdates={updates} />;
}
