import type { Metadata } from 'next'
import { Geist, Geist_Mono, Bebas_Neue, Asap_Condensed, Poppins, Inter, Roboto } from 'next/font/google'
import HydrationZustand from '@/templates/hydrationZustand'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const bebasNeue = Bebas_Neue({
  variable: '--font-bebas-neue',
  weight: '400',
  subsets: ['latin'],
})

const asapCondensed = Asap_Condensed({
  variable: '--font-asap-condensed',
  weight: '400',
  subsets: ['latin'],
})

const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '700'],
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Meditrack | Stay On Track With Us',
  description:
    'Your barangay health tracking platform. Book appointments, manage health records, and stay on track.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${asapCondensed.variable} ${poppins.variable} ${inter.variable} ${roboto.variable} antialiased`}
      >
        <Providers>
          <HydrationZustand>{children}</HydrationZustand>
          <Toaster richColors position="top-right" toastOptions={{ style: { fontSize: '16px' } }} />
        </Providers>
      </body>
    </html>
  )
}
