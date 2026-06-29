import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Strategy Partners Console',
    template: '%s | Strategy Partners',
  },
  description:
    'Console de IA multi-agente para decisões estratégicas C-level. 27 agentes especializados em M&A, vendas, finanças, segurança e conhecimento.',
  keywords: [
    'consultoria estratégica', 'M&A', 'fusões e aquisições', 'inteligência artificial',
    'agentes de IA', 'decisões C-level', 'strategy partners', 'Alceu Passos',
    'console multi-agente', 'assessoria empresarial', 'AI agents',
  ],
  authors: [{ name: 'Alceu Passos' }],
  creator: 'Alceu Passos · Strategy Partners',
  metadataBase: new URL('https://angrahub.angra.io'),
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://angrahub.angra.io',
    siteName: 'Strategy Partners Console',
    title: 'Strategy Partners Console — 27 Agentes de IA',
    description:
      'Console C-level com 27 agentes de IA especializados em M&A, vendas, finanças, segurança e conhecimento estratégico.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Strategy Partners Console',
    description: 'Console multi-agente de IA para decisões estratégicas C-level.',
  },
  robots: { index: false, follow: false },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Strategy Partners Console',
  description:
    'Console de IA multi-agente para decisões estratégicas C-level com 27 agentes especializados.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  author: {
    '@type': 'Person',
    name: 'Alceu Passos',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Strategy Partners',
    url: 'https://angrahub.angra.io',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${plexSans.variable} ${plexMono.variable} h-full`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="h-full font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
