import type { Metadata } from 'next';
import { AuthProvider } from '@/apps/web/auth/AuthProvider';
import { getCurrentViewer } from '@/packages/auth/src/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'EXURA | IDLE ADVENTURES',
  description: 'Monte sua party, treine skills, explore hunts e evolua no MMORPG idle de navegador Exura Idle Adventures.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getCurrentViewer();
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body><AuthProvider initialViewer={viewer}>{children}</AuthProvider></body>
    </html>
  );
}
