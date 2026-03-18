
import '../styles/globals.css'
import { OrdenesProvider } from '@/components/OrdenesContext'
import { AuthProvider } from '@/components/AuthContext'
import Topbar from '@/components/Topbar'
import BackButton from '@/components/BackButton'
import FloatingHome from "@/components/FloatingHome";
import AppFooter from '@/components/AppFooter'
import ThemeInitializer from '@/components/ThemeInitializer'

export const metadata = {
  title: 'Rectificadora Mindiocar',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-stone-100">
        <ThemeInitializer />
        <FloatingHome />

        <Topbar />

        {/* ErrorBoundary eliminado para evitar error de build en Server Component */}
          <AuthProvider>
            <OrdenesProvider>
              <main className="max-w-5xl mx-auto p-6">
              <div className="mb-4 flex justify-start">
                <BackButton />
              </div>
                {children}
              </main>
              <AppFooter />
            </OrdenesProvider>
          </AuthProvider>
        {/* ErrorBoundary eliminado para evitar error de build en Server Component */}
      </body>
    </html>
  )
}





