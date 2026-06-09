import type { Metadata } from 'next'
import { Lilita_One, Oswald, Nunito } from 'next/font/google'
import './globals.css'

const lilitaOne = Lilita_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const oswald = Oswald({
  weight: ['500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-heading',
})

const nunito = Nunito({
  weight: ['400', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'Last War — Classement',
  description: 'Tableau de classement Last War',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${lilitaOne.variable} ${oswald.variable} ${nunito.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  )
}
