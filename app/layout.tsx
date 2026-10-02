import './globals.css'
import type { Metadata } from 'next'
import { ToastProvider } from '@/components/common/Toast'
import { AppProvider } from '@/components/common/AppContext'
import { BranchProvider } from '@/app/context/BranchContext'

import { AuthProvider } from '@/components/auth/AuthContext'

export const metadata: Metadata = {
  title: 'Power EV Hub - EV Charger Installation ERP & Financial Dashboard',
  description: 'Enterprise ERP for EV charger installations, warehouse inventory management, and monthly financial cycle accounting.',
  icons: {
    icon: [
      { url: '/erp/icon.png', sizes: '48x48', type: 'image/png' },
      { url: '/erp/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/erp/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/erp/favicon.ico',
    apple: '/erp/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/erp/icon.png" sizes="48x48" type="image/png" />
        <link rel="icon" href="/erp/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="shortcut icon" href="/erp/favicon.ico" />
        <link rel="apple-touch-icon" href="/erp/icon.png" />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0b0f17] text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950">
        <AuthProvider>
          <AppProvider>
            <BranchProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </BranchProvider>
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
