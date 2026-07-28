import type { Metadata } from 'next';
import { Newsreader, Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Navbar } from '@/components/layout/Navbar';
import { SmoothScroll } from '@/components/layout/SmoothScroll';
import { SessionBootstrap } from '@/components/auth/SessionBootstrap';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
});

export const metadata: Metadata = {
  title: 'COS Code — Wire your AI agent in one command',
  description:
    'COS Code inspects your project and auto-configures the tooling an AI coding agent needs — MCP servers, Skills, .md context, OpenSpec, CodeRabbit — from a single `cos init`.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'bg-bg',
        'text-ink',
        'h-full',
        'antialiased',
        newsreader.variable,
        'font-sans',
        geist.variable,
        geistMono.variable,
      )}
    >
      {/* No flex/min-h here: ScrollSmoother drives the body's height itself.
          The Navbar stays a sibling of the wrapper because it's `fixed` —
          inside, it would ride the smoothed transform. */}
      <body>
        <SessionBootstrap />
        <Navbar />
        {/* Footer is opted into per-route, not mounted globally — below a
            min-h-screen-centered screen (auth) it would throw off that
            screen's vertical centering. */}
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
