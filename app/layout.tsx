import React from "react"
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

const _inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Meu Time - Estatisticas de Futebol',
  description: 'Acompanhe as estatisticas do seu time de futebol amador: gols, assistencias, cartoes e muito mais.',
}

export const viewport: Viewport = {
  themeColor: '#111114',
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
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(240 5% 10%)',
              border: '1px solid hsl(240 4% 16%)',
              color: 'hsl(0 0% 95%)',
            },
          }}
        />
      </body>
    </html>
  )
}
