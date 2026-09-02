import { notFound } from 'next/navigation';
import { GamePrototype } from '@/apps/web/components/GamePrototype';

export const dynamic = 'force-dynamic';

export default function DevelopmentGamePreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <>
      <GamePrototype />
      <div className="development-preview-badge" role="status">PREVIEW LOCAL · SEM AUTENTICAÇÃO</div>
    </>
  );
}
