// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeContext';
import ClientWrapper from '@/components/ClientWrapper';

export const metadata: Metadata = {
  title: 'E-Vote Application',
  description: 'A secure blockchain-based voting system.',
  icons: {
    icon: './e-vote.jpeg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* You can include meta tags, title, and other head elements here */}
      </head>
      <body>
        {/* ClientWrapper provides Suspense context to all client components */}
        <ClientWrapper>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </ClientWrapper>
        {/* Toaster for global toast notifications */}
      </body>
    </html>
  );
}
