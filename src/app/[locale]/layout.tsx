import React from 'react'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Toaster } from 'react-hot-toast'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import AuthProvider from '@/components/providers/AuthProvider'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  
  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/metadata/icon.ico',
      shortcut: '/metadata/icon.ico',
      apple: '/metadata/apple-icon.png',
    },
  }
}

export default async function RootLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const session = await getServerSession(authOptions)

  // Validate that the incoming `locale` parameter is valid
  if (!routing.locales.includes(locale as any)) notFound()


  return (
    <html lang={locale}>
      <head>
        <meta name="msvalidate.01" content="5058D208486CE0B008F765C9475DC9C2" />
      </head>
      <body className={inter.className}>
        <NextIntlClientProvider locale={locale}>
          <AuthProvider session={session}>
            <QueryProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main className="flex-grow">
                  {children}
                </main>
                <Footer />
              </div>
              <Toaster />
            </QueryProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
} 