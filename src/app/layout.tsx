import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

// `metadataBase` is what turns relative asset paths in Open Graph / Twitter
// metadata into the absolute URLs those scrapers require -- without it, Next.js
// warns at build time and social previews resolve against localhost.
//
// Sourced from NEXT_PUBLIC_SITE_URL so it follows the deployment rather than
// being hardcoded. The localhost fallback keeps `npm run dev` working; it is
// only ever wrong in the harmless direction, since a preview scraper never
// reaches a developer's machine.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const SITE_NAME = 'Alamo City Windshield Repair'
const SITE_DESCRIPTION = 'Professional windshield repair and replacement in San Antonio, TX'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
