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

  const handleRate = async (e, resourceId, rating) => {
    e.stopPropagation(); // Evitar que se abra el PDF al hacer click en las estrellas
    if (!user) {
      alert('Debes iniciar sesión para valorar');
      return;
    }
    try {
      await rateResource(resourceId, user.uid, rating);
      await loadResources();
    } catch (error) {
      console.error("Error rating resource:", error);
      alert('Error al valorar el recurso');
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
        <h1 className="text-5xl font-extrabold mb-6">No regeneres. <span className="text-indigo-600">Comparte.</span></h1>
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
            const userRating = getUserRating(resource);
            const avgRating = resource.averageRating || 0;
            const totalRatings = resource.totalRatings || 0;

            return (
              <div
                key={resource.id}
                className="bg-white p-6 rounded-2xl border hover:shadow-xl transition cursor-pointer relative"
                onClick={() => handleCardClick(resource)}
              >
                {!user && (
                  <div className="absolute top-4 right-4 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-medium">
                    Login requerido
                  </div>
                )}
                {user && user.uid === resource.userId && (
                  <button
                    onClick={(e) => handleDeleteResource(e, resource)}
                    className="absolute top-4 right-4 p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition"
                    title="Eliminar recurso"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <FileText className="h-10 w-10 text-indigo-600 mb-4" />
                <h3 className="font-bold text-lg">{resource.title}</h3>
                <p className="text-slate-500 text-sm mt-2">
                  Modelo: {resource.aiModel || 'NotebookLM'}
                </p>

                {/* Sistema de valoración */}
                <div className="mt-4 mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={18}
                          className={`cursor-pointer transition ${
                            star <= userRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : star <= avgRating
                              ? 'fill-yellow-200 text-yellow-200'
                              : 'text-slate-300'
                          } ${user ? 'hover:fill-yellow-300 hover:text-yellow-300' : ''}`}
                          onClick={(e) => handleRate(e, resource.id, star)}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">
                      {avgRating > 0 ? `${avgRating.toFixed(1)} (${totalRatings})` : 'Sin valoraciones'}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex justify-between items-center text-sm text-slate-400">
                  <span>Autor: {resource.author}</span>
                  <div className="flex gap-2 items-center">
                    <Download size={16} /> {resource.downloads}
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
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedResource(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition"
            >
              <X size={24} />
            </button>

            {/* Icono grande del archivo */}
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-50 p-6 rounded-2xl">
                <FileText className="h-20 w-20 text-indigo-600" />
              </div>
            </div>

            {/* Título y detalles */}
            <h2 className="text-3xl font-bold mb-4 text-center">{selectedResource.title}</h2>

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
                  <p className="text-slate-500 mb-1">Valoración</p>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={16}
                          className={`${
                            star <= (selectedResource.averageRating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
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
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowUploadModal(false)}
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
                disabled={uploading}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`inline-block px-6 py-3 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? 'Subiendo...' : 'Seleccionar archivo'}
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
