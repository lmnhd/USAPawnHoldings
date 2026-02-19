import './globals.css'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Playfair_Display, Outfit, JetBrains_Mono } from 'next/font/google'
import NavBar from '@/components/NavBar'
import ChatWidget from '@/components/ChatWidget'
import ThemeProvider from '@/components/ThemeProvider'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-playfair',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'USA Pawn Holdings | Jacksonville Pawn Shop',
  description: 'Jacksonville\'s premier pawn shop. Get instant cash for gold, jewelry, electronics, tools, and more. AI-powered appraisals in seconds.',
  keywords: ['pawn shop', 'Jacksonville', 'gold buyer', 'jewelry', 'electronics', 'instant cash'],
  icons: {
    icon: '/favicon.ico?v=20260215',
    shortcut: '/favicon.ico?v=20260215',
  },
  openGraph: {
    title: 'USA Pawn Holdings | Jacksonville Pawn Shop',
    description: 'Instant cash for your valuables. AI appraisals. Fast, fair, trustworthy.',
    url: 'https://usapawnfl.com',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${outfit.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="bg-vault-black-deep text-vault-text-light font-body antialiased">
        <ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'PawnShop',
                  name: 'USA Pawn Holdings',
                  description:
                    "Jacksonville's trusted pawn shop — fast cash loans, jewelry buying, gold & silver appraisals. Family-owned.",
                  url: 'https://usapawn.vercel.app',
                  telephone: '+1-904-744-1776',
                  address: {
                    '@type': 'PostalAddress',
                    streetAddress: '6132 Merrill Rd Ste 1',
                    addressLocality: 'Jacksonville',
                    addressRegion: 'FL',
                    postalCode: '32277',
                    addressCountry: 'US',
                  },
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: '30.2672',
                    longitude: '-81.6558',
                  },
                  openingHoursSpecification: [
                    {
                      '@type': 'OpeningHoursSpecification',
                      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                      opens: '10:00',
                      closes: '18:00',
                    },
                    {
                      '@type': 'OpeningHoursSpecification',
                      dayOfWeek: 'Saturday',
                      opens: '10:00',
                      closes: '17:00',
                    },
                  ],
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '4.5',
                    reviewCount: '51',
                  },
                  priceRange: '$$',
                  image: 'https://usapawn.vercel.app/og-image.svg',
                  sameAs: [
                    'https://www.facebook.com/usapawnholdings',
                    'https://www.instagram.com/usapawnholdings',
                  ],
                },
                {
                  '@type': 'Product',
                  name: 'Gold Jewelry Pawn Loans',
                  description:
                    'Fast cash loans on gold jewelry — rings, necklaces, bracelets. Get up to 33% of value instantly.',
                  offers: {
                    '@type': 'AggregateOffer',
                    priceCurrency: 'USD',
                    lowPrice: '50',
                    highPrice: '10000',
                  },
                },
                {
                  '@type': 'FAQPage',
                  mainEntity: [
                    {
                      '@type': 'Question',
                      name: 'What is a pawn loan?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'A pawn loan is a collateral-based loan where you leave an item of value with us and receive cash instantly. Loans are 30 days with 25% interest. You can reclaim your item anytime by repaying the loan plus interest.',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'What can I pawn?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'We accept jewelry, gold, silver, electronics, tools, musical instruments, video games, designer bags, watches, and more. If it has value, we take it!',
                      },
                    },
                    {
                      '@type': 'Question',
                      name: 'Do I need ID to pawn items?',
                      acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes, valid government-issued photo ID is required for all pawn transactions in Florida.',
                      },
                    },
                  ],
                },
              ],
            }),
          }}
        />
        <NavBar />
        <main>{children}</main>
        <Suspense fallback={null}>
          <ChatWidget />
        </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
