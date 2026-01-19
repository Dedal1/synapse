import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Comprobar si ya existe consentimiento en localStorage
    const consent = localStorage.getItem('cookieConsent');
    if (consent === null) {
      // No hay decisión previa, mostrar banner
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'true');
    setShowBanner(false);
    // Aqui podrias activar Google Analytics u otras cookies
    console.log('[Cookies] Usuario acepto cookies');
  };

  const handleReject = () => {
    localStorage.setItem('cookieConsent', 'false');
    setShowBanner(false);
    // Aqui podrias desactivar tracking
    console.log('[Cookies] Usuario rechazo cookies');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
      {/* Backdrop sutil */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" style={{ height: '150%', bottom: 0 }} />

      {/* Banner principal */}
      <div className="relative bg-slate-900 border-t border-slate-700 shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">

            {/* Icono y texto */}
            <div className="flex items-start sm:items-center gap-3 flex-1">
              <div className="hidden sm:flex items-center justify-center w-10 h-10 bg-indigo-600 rounded-xl flex-shrink-0">
                <Cookie className="text-white" size={20} />
              </div>
              <p className="text-sm sm:text-base text-slate-300 text-center sm:text-left leading-relaxed">
                <span className="sm:hidden">🍪 </span>
                Usamos cookies para mejorar tu experiencia y analizar el trafico.
                <span className="text-slate-400"> Puedes aceptar todas o solo las necesarias.</span>
              </p>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={handleReject}
                className="px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-xl transition-all duration-200 hover:bg-slate-800"
              >
                Solo necesarias
              </button>
              <button
                onClick={handleAccept}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30"
              >
                Aceptar todas
              </button>
            </div>
          </div>

          {/* Link a politica de privacidad (opcional) */}
          <div className="mt-3 sm:mt-2 text-center sm:text-left">
            <a
              href="/privacy"
              className="text-xs text-slate-500 hover:text-slate-400 underline underline-offset-2 transition"
            >
              Politica de privacidad
            </a>
          </div>
        </div>
      </div>

      {/* Animacion CSS */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default CookieBanner;
