import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, Check, Zap, User, BookOpen, Eye, FileText } from 'lucide-react';
import { auth, getPDFs, incrementDownloads, addValidation, removeValidation, deleteResource, getUserDownloadCount, incrementUserDownloadCount } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function ResourcePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [expandedSource, setExpandedSource] = useState(false);
  const [userDownloadCount, setUserDownloadCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

  const FREE_LIMIT = 5;

  const categories = [
    { value: 'Programación', color: 'bg-blue-100 text-blue-700' },
    { value: 'Marketing', color: 'bg-pink-100 text-pink-700' },
    { value: 'Ciencia', color: 'bg-purple-100 text-purple-700' },
    { value: 'Negocios', color: 'bg-green-100 text-green-700' },
    { value: 'Diseño', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'Otros', color: 'bg-slate-100 text-slate-700' },
  ];

  const getCategoryColor = (categoryValue) => {
    const category = categories.find(c => c.value === categoryValue);
    return category ? category.color : 'bg-slate-100 text-slate-700';
  };

  const getGradient = (id) => {
    const gradients = [
      'from-blue-500 to-purple-600',
      'from-pink-500 to-rose-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-indigo-500 to-blue-600',
    ];
    const index = parseInt(id.slice(0, 8), 16) % gradients.length;
    return gradients[index];
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              ...currentUser,
              isPro: userData.isPro || false,
              upgradedAt: userData.upgradedAt,
            });
          } else {
            setUser({
              ...currentUser,
              isPro: false,
            });
          }
        } catch (error) {
          console.error('[Auth] Error loading user data:', error);
          setUser({
            ...currentUser,
            isPro: false,
          });
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load user download count
  useEffect(() => {
    if (!user) {
      setUserDownloadCount(0);
      return;
    }

    const loadDownloadCount = async () => {
      try {
        const count = await getUserDownloadCount(user.uid);
        setUserDownloadCount(count);
      } catch (error) {
        console.error('[Download Count] Error:', error);
      }
    };

    loadDownloadCount();
  }, [user]);

  // Load resource data
  useEffect(() => {
    const loadResource = async () => {
      try {
        const resources = await getPDFs();
        const foundResource = resources.find(r => r.id === id);

        if (foundResource) {
          setResource(foundResource);
        } else {
          // Resource not found, redirect to home
          navigate('/');
        }
      } catch (error) {
        console.error('[Resource] Error loading:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadResource();
  }, [id, navigate]);

  const handleLogin = async () => {
    try {
      const { loginWithGoogle } = await import('./firebase');
      await loginWithGoogle();
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  };

  const handleToggleValidation = async (e) => {
    e.stopPropagation();
    if (!user) {
      await handleLogin();
      return;
    }

    const isValidated = resource.validatedBy?.includes(user.uid);

    try {
      if (isValidated) {
        await removeValidation(resource.id, user.uid);
        setResource({
          ...resource,
          validatedBy: resource.validatedBy.filter(uid => uid !== user.uid)
        });
      } else {
        await addValidation(resource.id, user.uid);
        setResource({
          ...resource,
          validatedBy: [...(resource.validatedBy || []), user.uid]
        });
      }
    } catch (error) {
      console.error("Error toggling validation:", error);
      alert('Error al validar el recurso');
    }
  };

  const handleDownload = async () => {
    if (!user) {
      await handleLogin();
      return;
    }

    try {
      const isPro = user.isPro || false;

      if (!isPro) {
        if (userDownloadCount >= FREE_LIMIT) {
          setShowLimitModal(true);
          return;
        }

        await incrementUserDownloadCount(user.uid);
        setUserDownloadCount(prev => prev + 1);

        const remaining = FREE_LIMIT - userDownloadCount - 1;
        if (remaining > 0) {
          alert(`Descarga iniciada. Te quedan ${remaining} descargas gratuitas este mes.`);
        } else {
          alert('Esta fue tu última descarga gratuita del mes. Actualiza a PRO para descargas ilimitadas.');
        }
      }

      await incrementDownloads(resource.id);
      window.open(resource.fileUrl, '_blank');
    } catch (error) {
      console.error("Error downloading:", error);
      alert('Error al descargar el recurso');
    }
  };

  const handlePreview = () => {
    // Load preview logic here if needed
    console.log('Preview functionality');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Cargando recurso...</div>
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  const validationCount = resource.validatedBy?.length || 0;
  const isValidatedByUser = user && resource.validatedBy?.includes(user.uid);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* SEO - Dynamic Meta Tags */}
      <Helmet>
        <title>{resource.title} | Synapse</title>
        <meta
          name="description"
          content={resource.description
            ? (resource.description.length > 160
                ? resource.description.substring(0, 160) + '...'
                : resource.description)
            : `Descarga ${resource.title} - Resumen de IA verificado por la comunidad en Synapse.`
          }
        />
      </Helmet>

      {/* Header with Back Button */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Volver a la Biblioteca</span>
            <span className="sm:hidden">Volver</span>
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold">Synapse</span>
          </div>
        </div>
      </nav>

      {/* Resource Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header - Thumbnail or Gradient with Icon */}
          <div className={`w-full relative flex items-center justify-center overflow-hidden ${
            resource.thumbnailUrl ? 'h-96' : `h-64 bg-gradient-to-br ${getGradient(resource.id)}`
          }`}>
            {resource.thumbnailUrl ? (
              <img
                src={resource.thumbnailUrl}
                alt={resource.title}
                className="w-full h-full object-cover block"
                style={{ objectPosition: 'center top' }}
              />
            ) : resource.avatarUrl ? (
              <img
                src={resource.avatarUrl}
                alt={resource.title}
                className="w-32 h-32 drop-shadow-2xl"
              />
            ) : (
              <FileText className="h-24 w-24 text-white drop-shadow-2xl" />
            )}
          </div>

          {/* Content */}
          <div className="p-8 pb-12">
            {/* Title */}
            <h1 className="text-4xl font-extrabold mb-2 text-center text-slate-900 leading-tight whitespace-normal break-words">
              {resource.title}
            </h1>

            {/* Description */}
            {resource.description && (
              <p className="text-base text-slate-700 text-center mb-4 leading-relaxed max-w-xl mx-auto">
                {resource.description}
              </p>
            )}

            {/* Category Badge */}
            {resource.category && (
              <div className="text-center mb-4">
                <span className={`inline-block px-4 py-2 text-sm font-semibold rounded-full ${getCategoryColor(resource.category)}`}>
                  {resource.category}
                </span>
              </div>
            )}

            <p className="text-center text-slate-500 mb-6">Recurso generado con IA</p>

            {/* Stats Grid */}
            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Autor</p>
                  <p className="font-semibold text-slate-900">{resource.author}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Modelo de IA</p>
                  <p className="font-semibold text-slate-900">{resource.aiModel || 'NotebookLM'}</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Descargas</p>
                  <p className="font-semibold text-slate-900 flex items-center gap-1">
                    <Download size={16} /> {resource.downloads}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 mb-1">Validaciones</p>
                  <div className="flex items-center gap-2">
                    <Check size={18} className="text-green-600" />
                    <span className="text-sm font-semibold text-slate-900">
                      {validationCount} {validationCount === 1 ? 'validación' : 'validaciones'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Original Source */}
            {resource.originalSource && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <BookOpen className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Fuente Original</p>
                    {resource.originalSource.length <= 80 ? (
                      <p className="text-sm text-blue-800 font-medium">
                        {resource.originalSource}
                      </p>
                    ) : (
                      <>
                        <p className={`text-sm text-blue-800 font-medium ${expandedSource ? '' : 'line-clamp-2'}`}>
                          {resource.originalSource}
                        </p>
                        <button
                          onClick={() => setExpandedSource(!expandedSource)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold mt-1 flex items-center gap-1 transition"
                        >
                          {expandedSource ? (
                            <>
                              Ver menos
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              Ver todo
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mb-6">
              {resource.previewUrls && resource.previewUrls.length > 0 && (
                <button
                  onClick={handlePreview}
                  className="w-full py-3 px-6 bg-slate-100 text-slate-900 rounded-full font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
                >
                  <Eye size={20} />
                  Vista Previa (Primeras 3 páginas)
                </button>
              )}
              <button
                onClick={handleDownload}
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition flex items-center justify-center gap-3 shadow-lg"
              >
                <Download size={24} />
                Descargar PDF Completo
              </button>
            </div>

            {/* Validation Button */}
            <div className="mb-4">
              {user ? (
                <button
                  onClick={handleToggleValidation}
                  className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    isValidatedByUser
                      ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Check size={18} className={isValidatedByUser ? 'stroke-2' : ''} />
                  {isValidatedByUser ? 'Validado por ti' : 'Validar utilidad'}
                </button>
              ) : (
                <div className="py-2.5 px-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
                  <Check size={18} className="inline mr-2" />
                  Inicia sesión para validar
                </div>
              )}
              <p className="text-xs text-slate-600 mt-2 text-center">
                {validationCount} {validationCount === 1 ? 'validación' : 'validaciones'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Download Limit Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center relative">
            <button
              onClick={() => setShowLimitModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-6">
              <Zap className="text-white" size={40} />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">
              ¡Límite alcanzado! 🚀
            </h2>

            <p className="text-lg text-slate-600 mb-6">
              Has alcanzado tu límite de <strong>{FREE_LIMIT} descargas gratuitas</strong> este mes.
            </p>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-200">
              <p className="font-bold text-indigo-900 mb-4">Con Synapse PRO obtienes:</p>
              <div className="space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0" />
                  <span className="text-slate-800">Descargas ilimitadas</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0" />
                  <span className="text-slate-800">Acceso prioritario a nuevos recursos</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0" />
                  <span className="text-slate-800">Sin publicidad</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check size={20} className="text-green-600 flex-shrink-0" />
                  <span className="text-slate-800">Soporte prioritario</span>
                </div>
              </div>
            </div>

            <button
              onClick={async () => {
                try {
                  const { loadStripe } = await import('@stripe/stripe-js');
                  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

                  const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid }),
                  });

                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);

                  window.location.href = data.url;
                } catch (error) {
                  console.error('[Stripe Checkout]', error);
                  alert('Error al procesar el pago: ' + error.message);
                }
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
            >
              Actualizar a PRO - 9.99€/mes
            </button>

            <button
              onClick={() => setShowLimitModal(false)}
              className="mt-3 text-sm text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResourcePage;
