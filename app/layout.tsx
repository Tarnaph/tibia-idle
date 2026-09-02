import type { Metadata } from 'next';
import { AuthProvider } from '@/apps/web/auth/AuthProvider';
import { getCurrentViewer } from '@/packages/auth/src/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cavebound — MMORPG idle no navegador',
  description: 'Monte sua party, treine skills, explore hunts e evolua em um MMORPG idle de navegador.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getCurrentViewer();
  return (
    <html lang="pt-BR">
      <body><AuthProvider initialViewer={viewer}>{children}</AuthProvider></body>
    </html>
  );
}
