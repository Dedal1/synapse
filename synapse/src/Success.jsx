import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, Check } from 'lucide-react';
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Confetti from 'react-confetti';

function Success() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Verificando pago...');
  const [showConfetti, setShowConfetti] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // CRITICAL: Use onAuthStateChanged to wait for Firebase auth to initialize
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('[Success] 🚀 User authenticated:', user.uid);
        setStatus('¡Pago recibido! Activando cuenta PRO... 🚀');

        try {
          // Force write to Firestore
          await setDoc(doc(db, 'users', user.uid), {
            isPro: true,
            upgradedAt: new Date().toISOString(),
            stripeSessionId: sessionId || 'unknown',
          }, { merge: true });

          console.log('[Success] ✅ USER UPGRADED TO PRO SUCCESSFULLY');
          setStatus('✅ ¡Todo listo! Redirigiendo...');

          // Wait 3 seconds then hard reload to home
          setTimeout(() => {
            console.log('[Success] Redirecting to home with force reload...');
            window.location.href = '/';
          }, 3000);

        } catch (error) {
          console.error('[Success] ❌ ERROR UPGRADING USER:', error);
          setStatus('❌ Hubo un error activando tu cuenta. Contacta con soporte.');
        }
      } else {
        // No user yet, waiting for Firebase to initialize
        console.log('[Success] Esperando a que Firebase detecte al usuario...');
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-6 animate-bounce">
          <Zap className="text-white" size={48} />
        </div>

        {/* Title */}
        <h1 className="text-5xl font-extrabold text-slate-900 mb-4">
          {status.includes('✅') ? '¡Pago Exitoso!' : '¡Bienvenido a Synapse PRO!'} 🎉
        </h1>

        {/* Subtitle */}
        <p className="text-xl text-slate-600 mb-8">
          {status}
        </p>

        {/* Benefits */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-indigo-200">
          <p className="text-lg font-bold text-indigo-900 mb-6">
            Ahora tienes acceso a:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 text-left">
              <Check size={24} className="text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Descargas Ilimitadas</p>
                <p className="text-sm text-slate-600">Sin límites mensuales</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <Check size={24} className="text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Acceso Prioritario</p>
                <p className="text-sm text-slate-600">Nuevos recursos primero</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <Check size={24} className="text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Sin Publicidad</p>
                <p className="text-sm text-slate-600">Experiencia premium</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-left">
              <Check size={24} className="text-green-600 mt-1 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-900">Soporte Prioritario</p>
                <p className="text-sm text-slate-600">Respuestas rápidas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-redirect message */}
        <div className="text-center">
          <div className="inline-block animate-pulse">
            <div className="inline-block w-3 h-3 bg-indigo-600 rounded-full mx-1"></div>
            <div className="inline-block w-3 h-3 bg-indigo-600 rounded-full mx-1 animation-delay-200"></div>
            <div className="inline-block w-3 h-3 bg-indigo-600 rounded-full mx-1 animation-delay-400"></div>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Serás redirigido automáticamente en unos segundos...
          </p>
          <p className="text-xs text-slate-400 mt-2">
            ⚠️ No cierres esta ventana...
          </p>
        </div>

        {/* Session info (for debugging) */}
        {sessionId && (
          <p className="text-xs text-slate-400 mt-6">
            Session ID: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default Success;
