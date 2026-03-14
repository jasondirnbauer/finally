import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinAlly — AI Trading Workstation',
  description: 'AI-powered trading terminal with live market data',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-terminal-bg text-terminal-text min-h-screen font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
