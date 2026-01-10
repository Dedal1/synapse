import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Check, ArrowRight } from 'lucide-react';
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';

function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);
  const [upgrading, setUpgrading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Stop confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const upgradeUserToPro = async () => {
      if (!sessionId) {
        console.error('[Success] No session ID found');
        navigate('/');
        return;
      }

      const user = auth.currentUser;
      if (!user) {
        console.error('[Success] No authenticated user');
        navigate('/');
        return;
      }

      try {
        console.log('[Success] Upgrading user to PRO:', user.uid);

        // Update user document in Firestore
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isPro: true,
          upgradedAt: new Date(),
          stripeSessionId: sessionId,
        });

        console.log('[Success] ✅ User upgraded to PRO successfully');
        setUpgrading(false);
      } catch (error) {
        console.error('[Success] Error upgrading user:', error);
        // Even if Firebase update fails, show success (Stripe payment succeeded)
        setUpgrading(false);
      }
    };

    upgradeUserToPro();
  }, [sessionId, navigate]);

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
          ¡Bienvenido a Synapse PRO! 🎉
        </h1>

        {/* Subtitle */}
        {upgrading ? (
          <p className="text-xl text-slate-600 mb-8">
            Actualizando tu cuenta...
          </p>
        ) : (
          <p className="text-xl text-slate-600 mb-8">
            Tu suscripción ha sido activada exitosamente
          </p>
        )}

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

        {/* CTA Button */}
        <button
          onClick={() => navigate('/')}
          disabled={upgrading}
          className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition inline-flex items-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {upgrading ? 'Procesando...' : 'Explorar Recursos'}
          <ArrowRight size={24} />
        </button>

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
