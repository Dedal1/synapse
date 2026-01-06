import React, { useState, useEffect } from 'react';
import { Search, Upload, FileText, Download, Zap, User, X, Star, Trash2 } from 'lucide-react';
import { auth, loginWithGoogle, logout, uploadPDF, getPDFs, incrementDownloads, rateResource, checkDuplicateTitle, deleteResource } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hasVotedThisSession, setHasVotedThisSession] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const rotatingWords = ['valorar', 'reconocer', 'curar'];

  // Function to get gradient based on resource ID/title
  const getGradient = (id) => {
    const gradients = [
      'from-blue-500 via-cyan-500 to-teal-500',
      'from-purple-500 via-pink-500 to-rose-500',
      'from-indigo-500 via-purple-500 to-pink-500',
      'from-amber-500 via-orange-500 to-red-500',
      'from-emerald-500 via-green-500 to-teal-500',
      'from-violet-500 via-purple-500 to-fuchsia-500',
      'from-sky-500 via-blue-500 to-indigo-500',
      'from-rose-500 via-pink-500 to-purple-500',
    ];

    // Simple hash function to consistently map id to gradient
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return gradients[hash % gradients.length];
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load PDFs
  useEffect(() => {
    loadResources();
  }, []);

  // Rotate words effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500); // Change word every 2.5 seconds

    return () => clearInterval(interval);
  }, [rotatingWords.length]);

  const loadResources = async () => {
    try {
      const pdfs = await getPDFs();
      setResources(pdfs);
    } catch (error) {
      console.error("Error loading resources:", error);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      alert("Error al iniciar sesión: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      alert("Error al cerrar sesión: " + error.message);
    }
  };

  const processFileUpload = async (file) => {
    if (!file) return;

    if (!acceptedTerms) {
      alert('Debes aceptar los términos para subir un archivo');
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    const title = file.name.replace('.pdf', '');

    // Verificar duplicados
    setUploading(true);
    try {
      const isDuplicate = await checkDuplicateTitle(title);
      if (isDuplicate) {
        alert('Este archivo ya ha sido subido anteriormente');
        setUploading(false);
        return;
      }

      await uploadPDF(file, user);
      await loadResources();
      setShowUploadModal(false);
      setIsDragging(false);
      setAcceptedTerms(false);
      alert('PDF subido exitosamente!');
    } catch (error) {
      alert('Error al subir el PDF: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    await processFileUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
    }
  };

  const handleCardClick = (resource) => {
    setSelectedResource(resource);
    // Reset rating states when opening a new resource
    setSelectedRating(0);
    setIsSubmittingRating(false);

    // Check if user has already voted this resource (from localStorage or API)
    const hasUserVoted = checkIfUserHasVoted(resource.id);
    setHasVotedThisSession(hasUserVoted);
  };

  const checkIfUserHasVoted = (resourceId) => {
    if (!user) return false;

    // Check localStorage for voted resources
    const votedResources = JSON.parse(localStorage.getItem('voted_resources_ids') || '[]');
    const hasVotedLocally = votedResources.includes(resourceId);

    // Check if user has already voted via API (exists in ratings array)
    const resource = resources.find(r => r.id === resourceId);
    const hasVotedInAPI = resource?.ratings?.some(r => r.userId === user.uid) || false;

    return hasVotedLocally || hasVotedInAPI;
  };

  const handleDownloadFromModal = async () => {
    if (!user) {
      await handleLogin();
      return;
    }

    if (!selectedResource) return;

    try {
      await incrementDownloads(selectedResource.id);
      window.open(selectedResource.fileUrl, '_blank');
      await loadResources();
      setSelectedResource(null); // Cerrar modal después de descargar
    } catch (error) {
      console.error("Error downloading:", error);
      alert('Error al descargar el recurso');
    }
  };

  const handleRatingSelect = (rating) => {
    // Only allow selection if user hasn't voted in this session
    if (!hasVotedThisSession && user) {
      setSelectedRating(rating);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedResource || !selectedRating || !user) return;

    setIsSubmittingRating(true);

    try {
      await rateResource(selectedResource.id, user.uid, selectedRating);
      await loadResources();

      // Update selected resource with new data
      const updatedResources = await getPDFs();
      const updatedResource = updatedResources.find(r => r.id === selectedResource.id);
      if (updatedResource) {
        setSelectedResource(updatedResource);
      }

      // Save to localStorage
      const votedResources = JSON.parse(localStorage.getItem('voted_resources_ids') || '[]');
      if (!votedResources.includes(selectedResource.id)) {
        votedResources.push(selectedResource.id);
        localStorage.setItem('voted_resources_ids', JSON.stringify(votedResources));
      }

      // Mark as voted and reset selection
      setHasVotedThisSession(true);
      setIsSubmittingRating(false);
    } catch (error) {
      console.error("Error rating resource:", error);
      alert('Error al valorar el recurso');
      setIsSubmittingRating(false);
    }
  };

  const getUserRating = (resource) => {
    if (!user || !resource.ratings) return 0;
    const userRating = resource.ratings.find(r => r.userId === user.uid);
    return userRating ? userRating.rating : 0;
  };

  const handleDeleteResource = async (e, resource) => {
    e.stopPropagation(); // Evitar que se abra el modal

    const confirmDelete = window.confirm(
      `¿Estás seguro de que quieres eliminar "${resource.title}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmDelete) return;

    try {
      await deleteResource(resource.id, resource.fileUrl);
      await loadResources();
      alert('Recurso eliminado exitosamente');
    } catch (error) {
      console.error("Error deleting resource:", error);
      alert('Error al eliminar el recurso. Por favor, inténtalo de nuevo.');
    }
  };

  const filteredResources = resources
    .filter(r =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.author.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Ordenar por rating promedio (mayor a menor), luego por fecha
      const ratingDiff = (b.averageRating || 0) - (a.averageRating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      // Si tienen el mismo rating, mostrar los más recientes primero
      return (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0);
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Zap className="text-white" size={20} />
            </div>
            <span className="text-xl font-bold">Synapse</span>
          </div>
          <div className="flex gap-4 items-center">
            {user ? (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition"
                >
                  <Upload size={18} /> Subir PDF
                </button>
                <div className="flex items-center gap-3">
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-10 h-10 rounded-full border-2 border-indigo-600"
                  />
                  <button
                    onClick={handleLogout}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition"
              >
                <User size={18} /> Entrar con Google
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="py-16 text-center bg-white border-b">
        <h1 className="text-5xl font-extrabold mb-4">No regeneres. <span className="text-indigo-600">Comparte.</span></h1>

        {/* Animated Subtitle */}
        <div className="mb-6 h-10 flex items-center justify-center">
          <p className="text-xl text-slate-600">
            El estándar humano para{' '}
            <span className="inline-block relative h-8 w-28 align-middle">
              <span
                key={currentWordIndex}
                className="word-fade-in-up absolute inset-0 flex items-center justify-center font-extrabold text-indigo-600"
              >
                {rotatingWords[currentWordIndex]}
              </span>
            </span>
            {' '}la Inteligencia Artificial.
          </p>
        </div>

        {!user && (
          <p className="text-slate-500 mb-4">
            Inicia sesión para descargar resúmenes verificados por la comunidad
          </p>
        )}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-4 text-slate-400" />
          <input
            className="w-full pl-12 py-4 border-2 rounded-2xl text-lg"
            placeholder="Busca conocimiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredResources.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-500">
            {searchTerm ? 'No se encontraron resultados' : 'No hay recursos aún. ¡Sé el primero en compartir!'}
          </div>
        ) : (
          filteredResources.map((resource) => {
            const avgRating = resource.averageRating || 0;
            const totalRatings = resource.totalRatings || 0;

            return (
              <div
                key={resource.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden border border-slate-100"
                onClick={() => handleCardClick(resource)}
              >
                {/* Gradient Header */}
                <div className={`h-32 bg-gradient-to-br ${getGradient(resource.id)} relative flex items-center justify-center`}>
                  {resource.avatarUrl ? (
                    <img
                      src={resource.avatarUrl}
                      alt={resource.title}
                      className="w-16 h-16 drop-shadow-lg"
                    />
                  ) : (
                    <FileText className="h-12 w-12 text-white drop-shadow-lg" />
                  )}

                  {/* Top-right badges/buttons */}
                  {!user && (
                    <div className="absolute top-3 right-3 bg-white/95 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm">
                      Login requerido
                    </div>
                  )}
                  {user && user.uid === resource.userId && (
                    <button
                      onClick={(e) => handleDeleteResource(e, resource)}
                      className="absolute top-3 right-3 p-2 bg-white/95 text-red-600 rounded-full hover:bg-red-50 transition shadow-sm"
                      title="Eliminar recurso"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6">
                  {/* Title */}
                  <h3 className="font-bold text-xl text-slate-900 mb-3 line-clamp-2">{resource.title}</h3>

                  {/* AI Model Badge */}
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
                      {resource.aiModel || 'NotebookLM'}
                    </span>
                  </div>

                  {/* Star Rating System - Read Only */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            className={`transition-all ${
                              star <= avgRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">
                        {avgRating > 0 ? `${avgRating.toFixed(1)} (${totalRatings})` : 'Sin valoraciones'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm text-slate-600 font-medium truncate">
                      {resource.author}
                    </span>
                    <div className="flex gap-1.5 items-center text-slate-500">
                      <Download size={16} />
                      <span className="text-sm font-semibold">{resource.downloads}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Resource Detail Modal */}
      {selectedResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedResource(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full relative overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 text-white hover:text-slate-200 transition z-10 bg-black/20 rounded-full p-2"
            >
              <X size={24} />
            </button>

            {/* Gradient Header with Icon */}
            <div className={`h-48 bg-gradient-to-br ${getGradient(selectedResource.id)} relative flex items-center justify-center`}>
              {selectedResource.avatarUrl ? (
                <img
                  src={selectedResource.avatarUrl}
                  alt={selectedResource.title}
                  className="w-32 h-32 drop-shadow-2xl"
                />
              ) : (
                <FileText className="h-24 w-24 text-white drop-shadow-2xl" />
              )}
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Título y detalles */}
              <h2 className="text-4xl font-extrabold mb-2 text-center text-slate-900 leading-tight">{selectedResource.title}</h2>
              <p className="text-center text-slate-500 mb-6">Recurso generado con IA</p>

              <div className="bg-slate-50 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Autor</p>
                    <p className="font-semibold text-slate-900">{selectedResource.author}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Modelo de IA</p>
                    <p className="font-semibold text-slate-900">{selectedResource.aiModel || 'NotebookLM'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Descargas</p>
                    <p className="font-semibold text-slate-900 flex items-center gap-1">
                      <Download size={16} /> {selectedResource.downloads}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Valoración promedio</p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            className={`${
                              star <= (selectedResource.averageRating || 0)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {selectedResource.averageRating > 0
                          ? `${selectedResource.averageRating.toFixed(1)} (${selectedResource.totalRatings})`
                          : 'Sin valoraciones'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Rating Section */}
              {user && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6 border border-indigo-100">
                  <h3 className="font-bold text-lg text-slate-900 mb-3">
                    {hasVotedThisSession ? 'Tu valoración' : 'Valora este recurso:'}
                  </h3>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const userRating = getUserRating(selectedResource);
                        const displayRating = hasVotedThisSession ? userRating : selectedRating;

                        return (
                          <button
                            key={star}
                            onClick={() => handleRatingSelect(star)}
                            disabled={hasVotedThisSession}
                            className={`transition-all focus:outline-none ${
                              hasVotedThisSession
                                ? 'cursor-not-allowed'
                                : 'hover:scale-125 cursor-pointer'
                            }`}
                          >
                            <Star
                              size={32}
                              className={`transition-all ${
                                star <= displayRating
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-md'
                                  : hasVotedThisSession
                                  ? 'text-slate-300'
                                  : 'text-slate-400 hover:text-amber-300 hover:fill-amber-200'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm text-slate-600">
                      {hasVotedThisSession
                        ? `${getUserRating(selectedResource)} estrella${getUserRating(selectedResource) > 1 ? 's' : ''}`
                        : selectedRating > 0
                        ? `${selectedRating} estrella${selectedRating > 1 ? 's' : ''} seleccionada${selectedRating > 1 ? 's' : ''}`
                        : 'Haz clic para seleccionar'
                      }
                    </span>
                  </div>

                  {/* Submit Button */}
                  {!hasVotedThisSession && selectedRating > 0 && (
                    <button
                      onClick={handleSubmitRating}
                      disabled={isSubmittingRating}
                      className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                        isSubmittingRating
                          ? 'bg-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isSubmittingRating ? 'Enviando...' : 'Enviar Valoración'}
                    </button>
                  )}

                  {/* Already Voted Message */}
                  {hasVotedThisSession && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                      <p className="text-sm text-slate-600 font-medium">
                        Ya has valorado este recurso
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!user && (
                <div className="bg-slate-100 rounded-xl p-4 mb-6 text-center">
                  <p className="text-sm text-slate-600">
                    Inicia sesión para valorar este recurso
                  </p>
                </div>
              )}

              {/* Botón de descarga grande */}
              <button
                onClick={handleDownloadFromModal}
                className="w-full py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-3"
              >
                <Download size={24} />
                {user ? 'Descargar Recurso' : 'Inicia sesión para descargar'}
              </button>

              {!user && (
                <p className="text-center text-sm text-slate-500 mt-4">
                  Necesitas estar registrado para acceder a este contenido
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => {
                setShowUploadModal(false);
                setAcceptedTerms(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6">Subir PDF</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 border-solid'
                  : 'border-slate-300 bg-transparent'
              }`}
            >
              <Upload
                className={`mx-auto mb-4 transition-colors ${
                  isDragging ? 'text-indigo-700' : 'text-indigo-600'
                }`}
                size={48}
              />
              <p className="text-slate-600 mb-2 font-medium">
                {isDragging ? '¡Suelta el archivo aquí!' : 'Arrastra un PDF aquí'}
              </p>
              <p className="text-slate-400 text-sm mb-4">o</p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading || !acceptedTerms}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`inline-block px-6 py-3 rounded-full cursor-pointer transition ${
                  uploading || !acceptedTerms
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
              </label>
            </div>

            {/* Legal Checkbox */}
            <div className="mt-6 flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                Certifico que tengo los derechos para compartir este documento y que es un contenido original o de libre distribución. Acepto que Synapse es una plataforma de curación y no propietaria del contenido.
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
