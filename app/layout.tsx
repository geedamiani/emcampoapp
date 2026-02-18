import React from "react"
import type { Metadata, Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Meu Time - Estatisticas de Futebol',
  description: 'Acompanhe as estatisticas do seu time de futebol amador: gols, assistencias, cartoes e muito mais.',
}

export const viewport: Viewport = {
  themeColor: '#f5f0f0',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'oklch(1.0000 0 0)',
              border: '1px solid oklch(0.8690 0.0198 252.8943)',
              color: 'oklch(0.2151 0.0518 259.4035)',
            },
          }}
        />
      </body>
    </html>
  )
}
