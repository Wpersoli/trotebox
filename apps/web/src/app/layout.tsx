import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: {
    default: 'TroteBox — Riso na linha. Surpresa na caixa.',
    template: '%s · TroteBox'
  },
  description: 'TroteBox — trotes de comédia, roteiros originais e experiências de voz com controle, créditos e segurança.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/brand/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#5b21c7'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
