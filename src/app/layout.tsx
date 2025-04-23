import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Studar - Plataforma de Estudos',
  description: 'Organize e potencialize seus estudos com a técnica Pomodoro e revisão espaçada',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-gray-100">
          {children}
        </div>
      </body>
    </html>
  );
} 