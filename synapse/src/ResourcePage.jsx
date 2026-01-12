import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, Check, Zap, User, BookOpen, FileText, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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

  const handleOpenLightbox = (index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const handleNextImage = () => {
    if (resource.previewUrls && currentImageIndex < resource.previewUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const handleKeyPress = (e) => {
    if (!lightboxOpen) return;
    if (e.key === 'ArrowRight') handleNextImage();
    if (e.key === 'ArrowLeft') handlePrevImage();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [lightboxOpen, currentImageIndex]);

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

      {/* Hero Header Inmersivo */}
      <div className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {/* Background Image with Blur */}
        <div className="absolute inset-0">
          {resource.thumbnailUrl ? (
            <>
              <img
                src={resource.thumbnailUrl}
                alt={resource.title}
                className="w-full h-full object-cover blur-xl scale-110"
              />
              <div className="absolute inset-0 bg-black/70"></div>
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getGradient(resource.id)}`}>
              <div className="absolute inset-0 bg-black/50"></div>
            </div>
          )}
        </div>

        {/* Back Button - Floating */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 rounded-full transition border border-white/20"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Volver</span>
        </button>

        {/* Synapse Logo - Floating */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Zap className="text-white" size={18} />
          </div>
          <span className="text-lg font-bold text-white">Synapse</span>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight max-w-4xl drop-shadow-2xl">
            {resource.title}
          </h1>

          {resource.description && (
            <p className="text-xl text-white/90 mb-8 max-w-2xl leading-relaxed drop-shadow-lg">
              {resource.description}
            </p>
          )}

          {/* Category Badge */}
          {resource.category && (
            <span className={`inline-block px-6 py-2 text-sm font-semibold rounded-full ${getCategoryColor(resource.category)} shadow-lg mb-4`}>
              {resource.category}
            </span>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap gap-6 justify-center text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{resource.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Download size={16} />
              <span>{resource.downloads} descargas</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} />
              <span>{validationCount} validaciones</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10 pb-16">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">

          {/* Info Section */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 text-sm text-slate-600 mb-6">
              <span className="px-3 py-1 bg-slate-100 rounded-full">
                {resource.aiModel || 'NotebookLM'}
              </span>
              <span>•</span>
              <span>Recurso generado con IA</span>
            </div>

            {/* Original Source */}
            {resource.originalSource && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <BookOpen className="text-blue-600 mt-0.5 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-blue-900 uppercase mb-1">Fuente Original</p>
                    {resource.originalSource.length <= 150 ? (
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
          </div>

          {/* Preview Gallery Section */}
          {resource.previewUrls && resource.previewUrls.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
                Echa un vistazo al interior:
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resource.previewUrls.map((pageUrl, index) => (
                  <div key={index} className="group cursor-pointer" onClick={() => handleOpenLightbox(index)}>
                    <div className="bg-white p-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border-4 border-white hover:scale-105 relative">
                      <img
                        src={pageUrl}
                        alt={`Página ${index + 1}`}
                        className="w-full h-auto rounded-lg shadow-md"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-xl flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                          <Eye size={24} className="text-slate-900" />
                        </div>
                      </div>
                      <p className="text-center text-sm font-semibold text-slate-600 mt-3">
                        Página {index + 1}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Download Button - Centered & Large */}
          <div className="mb-8">
            <button
              onClick={handleDownload}
              className="w-full max-w-md mx-auto block py-5 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-2xl flex items-center justify-center gap-3"
            >
              <Download size={28} />
              Descargar PDF Completo
            </button>
          </div>

          {/* Validation Section */}
          <div className="border-t border-slate-200 pt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
              ¿Te resultó útil este recurso?
            </h3>
            {user ? (
              <button
                onClick={handleToggleValidation}
                className={`w-full max-w-sm mx-auto block py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  isValidatedByUser
                    ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Check size={20} className={isValidatedByUser ? 'stroke-2' : ''} />
                {isValidatedByUser ? 'Validado por ti' : 'Validar utilidad'}
              </button>
            ) : (
              <div className="w-full max-w-sm mx-auto py-3 px-6 bg-slate-50 rounded-xl text-center text-sm text-slate-500">
                <Check size={18} className="inline mr-2" />
                Inicia sesión para validar
              </div>
            )}
            <p className="text-sm text-slate-600 mt-3 text-center">
              {validationCount} {validationCount === 1 ? 'persona validó' : 'personas validaron'} este recurso
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && resource.previewUrls && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
          >
            <X size={32} />
          </button>

          {/* Image Counter */}
          <div className="absolute top-6 left-6 z-50 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white font-semibold">
            {currentImageIndex + 1} / {resource.previewUrls.length}
          </div>

          {/* Previous Button */}
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrevImage();
              }}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* Next Button */}
          {currentImageIndex < resource.previewUrls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNextImage();
              }}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full transition text-white"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* Image */}
          <div
            className="w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={resource.previewUrls[currentImageIndex]}
              alt={`Página ${currentImageIndex + 1}`}
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Page Label */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full text-white font-semibold">
            Página {currentImageIndex + 1}
          </div>
        </div>
      )}

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
