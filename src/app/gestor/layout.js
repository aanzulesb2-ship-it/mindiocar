import '../../styles/globals.css';
import { OrdenesProvider } from '@/components/OrdenesContext';
import { AuthProvider } from '@/components/AuthContext';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'Gestor | Rectificadora Mindiocar',
};

export default function GestorLayout({ children }) {
  return (
    <AuthProvider>
      <OrdenesProvider>
        <div className="min-h-screen bg-linear-to-br from-stone-100 via-stone-200 to-stone-50 text-stone-900">
          <div className="sticky top-0 z-40 shadow-md bg-white/90 backdrop-blur supports-bg-white/80">
            <Topbar />
          </div>
          <main className="max-w-5xl mx-auto p-4 md:p-8 bg-white/95 rounded-2xl shadow-xl mt-8 transition-all duration-300 hover:shadow-2xl">
            {children}
          </main>
          <footer className="bg-linear-to-t from-stone-200 to-stone-100 border-t border-stone-200 mt-16">
            <div className="max-w-5xl mx-auto px-6 py-8">
              <div className="text-center text-stone-600 text-sm">
                <p>&copy; 2026 Rectificadora Mindiocar. Todos los derechos reservados.</p>
                <p className="mt-2">
                  Sistema de gestión desarrollado para optimizar procesos de rectificación de motores.
                </p>
                <p className="mt-2 text-stone-500">Versión 1.0.0</p>
              </div>
            </div>
          </footer>
        </div>
      </OrdenesProvider>
    </AuthProvider>
  );
}



