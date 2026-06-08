import type { Metadata } from 'next'
import { Rajdhani, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const rajdhani = Rajdhani({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

const jetbrainsMono = JetBrains_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Last War — Classement',
  description: 'Tableau de classement Last War',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${rajdhani.variable} ${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
