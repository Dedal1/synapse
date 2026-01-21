import React, { useState, useEffect, useMemo, memo } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Upload, FileText, Download, Zap, User, X, Check, Trash2, Bookmark, BookOpen, Eye, ArrowUp, Settings, Flag } from 'lucide-react';
import { auth, loginWithGoogle, logout, uploadPDF, getPDFs, incrementDownloads, addValidation, removeValidation, checkDuplicateTitle, deleteResource, subscribeToFavorites, addToFavorites, removeFromFavorites, getUserDownloadCount, incrementUserDownloadCount } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import * as pdfjsLib from 'pdfjs-dist';
import CookieBanner from './CookieBanner';

// Configure PDF.js worker - Use local worker for reliability with Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// =====================================================
// COMPONENTE RESOURCECARD - Aislado para evitar bugs de closure
// =====================================================
const ResourceCard = memo(function ResourceCard({
  resource,
  user,
  validFavorites,
  onCardClick,
  onToggleValidation,
  onToggleFavorite,
  onDeleteResource,
  onLoadPreview,
  getGradient,
  getCategoryColor,
}) {
  // Calcular TODO dentro del componente con el resource específico
  const resourceId = resource.id;
  const resourceTitle = resource.title;
  const validationCount = resource.validatedBy?.length || 0;
  const isValidatedByUser = user && resource.validatedBy?.includes(user.uid);
  const isFavorite = validFavorites.includes(resourceId);
  const isOwner = user && user.uid === resource.userId;

  const handleValidationClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onToggleValidation(resourceId);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(e, resourceId);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDeleteResource(e, resource);
  };

  const handlePreviewClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onLoadPreview(resource);
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden border border-slate-100"
      onClick={() => onCardClick(resource)}
    >
      {/* Header - Thumbnail or Gradient */}
      <div className={`w-full h-48 relative flex items-center justify-center overflow-hidden ${
        resource.thumbnailUrl ? '' : `bg-gradient-to-br ${getGradient(resourceId)}`
      }`}>
        {resource.thumbnailUrl ? (
          <img
            src={resource.thumbnailUrl}
            alt={resourceTitle}
            className="w-full h-full object-cover block"
            style={{ objectPosition: 'center top' }}
          />
        ) : resource.avatarUrl ? (
          <img
            src={resource.avatarUrl}
            alt={resourceTitle}
            className="w-16 h-16 drop-shadow-lg"
          />
        ) : (
          <FileText className="h-12 w-12 text-white drop-shadow-lg" />
        )}

        {/* Top-left bookmark button */}
        {user && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 left-3 p-2 bg-white/95 rounded-full hover:bg-indigo-50 transition shadow-sm z-10"
            title={isFavorite ? "Quitar de guardados" : "Guardar para después"}
          >
            <Bookmark
              size={18}
              className={`transition-all ${
                isFavorite
                  ? 'fill-indigo-600 text-indigo-600'
                  : 'text-slate-600'
              }`}
            />
          </button>
        )}

        {/* Top-right badges/buttons */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          {/* Preview button */}
          {resource.previewUrls && resource.previewUrls.length > 0 && (
            <button
              onClick={handlePreviewClick}
              className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition shadow-sm group"
              title="Vista rápida"
            >
              <Eye size={18} className="text-white" />
            </button>
          )}

          {!user && (
            <div className="bg-white/95 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-semibold shadow-sm">
              Login requerido
            </div>
          )}
          {isOwner && (
            <button
              onClick={handleDeleteClick}
              className="p-2 bg-white/95 text-red-600 rounded-full hover:bg-red-50 transition shadow-sm"
              title="Eliminar recurso"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="font-bold text-xl text-slate-900 mb-2 line-clamp-2">{resourceTitle}</h3>

        {/* Description */}
        {resource.description && (
          <p className="text-sm text-slate-600 mb-3 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        )}

        {/* Badges: Category and AI Model */}
        <div className="mb-4 flex flex-wrap gap-2">
          {resource.category && (
            <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(resource.category)}`}>
              {resource.category}
            </span>
          )}
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full">
            {resource.aiModel || 'NotebookLM'}
          </span>
        </div>

        {/* Validation Button */}
        <div className="mb-4">
          {user ? (
            <button
              type="button"
              onClick={handleValidationClick}
              className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                isValidatedByUser
                  ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Check size={18} className={isValidatedByUser ? 'stroke-2' : ''} />
              {isValidatedByUser ? '✅ Voto registrado' : '¿Te fue útil? 👍'}
            </button>
          ) : (
            <div className="py-2.5 px-4 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
              <Check size={18} className="inline mr-2" />
              Inicia sesión para votar
            </div>
          )}
          <p className="text-xs text-slate-600 mt-2 text-center">
            {validationCount} {validationCount === 1 ? 'validación' : 'validaciones'}
          </p>
        </div>

        {/* Footer Info */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600 font-medium truncate">
              {resource.author}
            </span>
            <div className="flex gap-1.5 items-center text-slate-500">
              <Download size={16} />
              <span className="text-sm font-semibold">{resource.downloads}</span>
            </div>
          </div>
          {/* Copyright Report Link */}
          <a
            href={`mailto:soporte@synapse.app?subject=Reporte%20Copyright%20-%20ID%3A%20${resourceId}&body=Hola%2C%0A%0AQuiero%20reportar%20el%20siguiente%20recurso%20por%20posible%20infracción%20de%20copyright%3A%0A%0AID%20del%20Recurso%3A%20${resourceId}%0ATítulo%3A%20${encodeURIComponent(resourceTitle)}%0AAutor%3A%20${encodeURIComponent(resource.author)}%0A%0AMotivo%20del%20reporte%3A%0A%0A%0A%0AFirma%3A%0A`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 transition-colors mt-1"
            title="Reportar infracción de copyright"
          >
            <Flag size={12} />
            <span>Reportar</span>
          </a>
        </div>
      </div>
    </div>
  );
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [resources, setResources] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloadsCount, setDownloadsCount] = useState(() => {
    // Inicializar desde localStorage
    const saved = localStorage.getItem('synapse_downloads_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [selectedResource, setSelectedResource] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [resourceDescription, setResourceDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [thumbnailBlob, setThumbnailBlob] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [previewBlobs, setPreviewBlobs] = useState([]);
  const [userFavorites, setUserFavorites] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedAiModel, setSelectedAiModel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [originalSource, setOriginalSource] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPages, setPreviewPages] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [userDownloadCount, setUserDownloadCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [expandedSource, setExpandedSource] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(true);

  const FREE_LIMIT = 5;
  const MAX_DOWNLOADS = 5;
  const SOURCE_MAX_LENGTH = 280;
  const rotatingWords = ['descubrir', 'validar', 'compartir'];

  const aiModels = [
    { value: 'NotebookLM', label: 'NotebookLM (Google)' },
    { value: 'ChatGPT', label: 'ChatGPT (OpenAI)' },
    { value: 'Claude', label: 'Claude (Anthropic)' },
    { value: 'Gemini', label: 'Gemini (Google)' },
    { value: 'Perplexity', label: 'Perplexity' },
    { value: 'Manual', label: 'Creación Humana (Manual)' },
  ];

  const categories = [
    { value: 'Tecnología', label: '💻 Tecnología', color: 'bg-blue-100 text-blue-700' },
    { value: 'Educación', label: '📚 Educación', color: 'bg-green-100 text-green-700' },
    { value: 'Negocios', label: '💼 Negocios', color: 'bg-purple-100 text-purple-700' },
    { value: 'Legal/Administrativo', label: '⚖️ Legal/Administrativo', color: 'bg-amber-100 text-amber-700' },
    { value: 'Salud/Bienestar', label: '🏥 Salud/Bienestar', color: 'bg-rose-100 text-rose-700' },
    { value: 'Otros', label: '📁 Otros', color: 'bg-slate-100 text-slate-700' },
  ];

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

  // Function to get category color
  const getCategoryColor = (categoryValue) => {
    const category = categories.find(c => c.value === categoryValue);
    return category ? category.color : 'bg-slate-100 text-slate-700';
  };

  // Listen for auth state changes and load user data from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Load user data from Firestore to get isPro status
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('./firebase');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

          if (userDoc.exists()) {
            // Merge Firebase Auth user with Firestore data
            const userData = userDoc.data();
            setUser({
              ...currentUser,
              isPro: userData.isPro || false,
              upgradedAt: userData.upgradedAt,
            });
          } else {
            // No Firestore document, use Auth user only
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

  // Check if user already accepted cookies
  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (cookiesAccepted === 'true') {
      setShowCookieBanner(false);
    }
  }, []);


  const handleCloseCookieBanner = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setShowCookieBanner(false);
  };

  // Subscribe to user favorites
  useEffect(() => {
    if (!user) {
      setUserFavorites([]);
      return;
    }

    const unsubscribe = subscribeToFavorites(user.uid, (favorites) => {
      // FIX BUG #1: Asegurar que favorites siempre sea un array válido
      // y filtrar cualquier valor null/undefined que pudiera venir de Firebase
      const cleanFavorites = Array.isArray(favorites) 
        ? favorites.filter(id => id != null && id !== '') 
        : [];
      setUserFavorites(cleanFavorites);
    });

    return () => unsubscribe();
  }, [user]);

  // Load user download count from Firebase and sync with header
  useEffect(() => {
    if (!user) {
      setUserDownloadCount(0);
      return;
    }

    const loadDownloadCount = async () => {
      try {
        const count = await getUserDownloadCount(user.uid);
        setUserDownloadCount(count);
        // FIX: Sync Firebase count with header's downloadsCount and localStorage
        setDownloadsCount(count);
        localStorage.setItem('synapse_downloads_count', count.toString());
        console.log('[App.jsx] Synced download count from Firebase:', count);
      } catch (error) {
        console.error("Error loading download count:", error);
      }
    };

    loadDownloadCount();
  }, [user]);

  // Sync download count when location changes (user navigates back to home)
  useEffect(() => {
    const saved = localStorage.getItem('synapse_downloads_count');
    const count = saved ? parseInt(saved, 10) : 0;
    console.log('[App.jsx] Location changed, syncing download count:', count);
    setDownloadsCount(count);
  }, [location]);

  // Listen for download count changes from ResourcePage to sync badge
  useEffect(() => {
    const handleDownloadCountChange = (e) => {
      const newCount = e.detail.count;
      console.log('[App.jsx] Download count updated via CustomEvent:', newCount);
      setDownloadsCount(newCount);
    };

    const syncDownloadCount = () => {
      const saved = localStorage.getItem('synapse_downloads_count');
      const count = saved ? parseInt(saved, 10) : 0;
      console.log('[App.jsx] Syncing download count from localStorage:', count);
      setDownloadsCount(count);
    };

    // Listen for custom event (works in same tab)
    window.addEventListener('downloadCountChanged', handleDownloadCountChange);

    // Sync when page becomes visible (user navigates back)
    window.addEventListener('focus', syncDownloadCount);

    // Sync on popstate (browser back button)
    window.addEventListener('popstate', syncDownloadCount);

    return () => {
      window.removeEventListener('downloadCountChanged', handleDownloadCountChange);
      window.removeEventListener('focus', syncDownloadCount);
      window.removeEventListener('popstate', syncDownloadCount);
    };
  }, []);

  // Handle scroll for "Back to Top" button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const loadResources = async () => {
    try {
      const pdfs = await getPDFs();
      // Asegurar que cada recurso tenga validatedBy como array vacío si no existe
      const cleanedPdfs = pdfs.map(pdf => ({
        ...pdf,
        validatedBy: Array.isArray(pdf.validatedBy) ? pdf.validatedBy : [],
      }));
      setResources(cleanedPdfs);
    } catch (error) {
      // Silent error - resources will remain empty
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

  const handleManageSubscription = async () => {
    if (!user || !user.email) {
      alert('Debes iniciar sesión para gestionar tu suscripción');
      return;
    }

    try {
      console.log('[Portal] Opening Customer Portal for:', user.email);

      // Call backend to create portal session
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      const data = await response.json();
      console.log('[Portal] Redirecting to Customer Portal');

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('[Portal] Error:', error);
      alert('Error al abrir el portal de gestión: ' + error.message);
    }
  };

  const generatePreviews = async (file) => {
    console.log('[Previews] Starting generation for file:', file.name);
    setGeneratingThumbnail(true);

    try {
      console.log('[Previews] Step 1: Reading file as ArrayBuffer...');
      const arrayBuffer = await file.arrayBuffer();
      console.log('[Previews] ArrayBuffer size:', arrayBuffer.byteLength, 'bytes');

      console.log('[Previews] Step 2: Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log('[Previews] PDF loaded successfully. Pages:', pdf.numPages);

      // Generate up to 3 preview pages
      const pagesToGenerate = Math.min(3, pdf.numPages);
      console.log(`[Previews] Generating ${pagesToGenerate} preview pages...`);

      const previewBlobs = [];
      const previewUrls = [];

      for (let i = 1; i <= pagesToGenerate; i++) {
        console.log(`[Previews] Step ${i}: Getting page ${i}...`);
        const page = await pdf.getPage(i);

        console.log(`[Previews] Creating viewport for page ${i}...`);
        const viewport = page.getViewport({ scale: 1.5 });
        console.log(`[Previews] Viewport dimensions: ${viewport.width} x ${viewport.height}`);

        console.log(`[Previews] Creating canvas for page ${i}...`);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        console.log(`[Previews] Rendering page ${i} to canvas...`);
        await page.render({ canvasContext: context, viewport: viewport }).promise;

        console.log(`[Previews] Converting page ${i} to blob...`);
        const blob = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/jpeg', 0.85);
        });
        console.log(`[Previews] Blob ${i} created. Size:`, blob?.size, 'bytes');

        previewBlobs.push(blob);

        // Create preview URL for display during upload
        const previewUrl = URL.createObjectURL(blob);
        previewUrls.push(previewUrl);
      }

      // Set first page as thumbnail for card display
      setThumbnailBlob(previewBlobs[0]);
      setThumbnailPreview(previewUrls[0]);

      setGeneratingThumbnail(false);
      console.log('[Previews] ✅ Generation completed successfully');

      return previewBlobs; // Return all blobs for upload
    } catch (error) {
      console.error('[Previews] ❌ ERROR during generation:', error);
      console.error('[Previews] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setGeneratingThumbnail(false);
      setThumbnailBlob(null);
      setThumbnailPreview(null);

      alert('No se pudo generar la vista previa del PDF. El archivo se subirá sin miniaturas.');
      return []; // Return empty array on error
    }
  };

  const loadPdfPreview = (resource) => {
    console.log('[Preview] Loading pre-generated previews for:', resource.title);
    setShowPreviewModal(true);
    setLoadingPreview(true);

    // Check if resource has pre-generated preview URLs
    if (resource.previewUrls && resource.previewUrls.length > 0) {
      console.log(`[Preview] Found ${resource.previewUrls.length} pre-generated preview pages`);
      setPreviewPages(resource.previewUrls);
      setLoadingPreview(false);
    } else {
      // No previews available (old resource)
      console.log('[Preview] No pre-generated previews found - showing fallback');
      setPreviewPages([]);
      setLoadingPreview(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor selecciona un archivo PDF');
      return;
    }

    setSelectedFile(file);
    setIsDragging(false);

    // Generate preview pages (thumbnail + full previews)
    const blobs = await generatePreviews(file);
    setPreviewBlobs(blobs);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    handleFileSelect(file);
  };

  const handlePublishResource = async () => {
    if (!selectedFile || !resourceDescription.trim() || !acceptedTerms || !selectedAiModel || !selectedCategory || !originalSource.trim()) {
      return;
    }

    const title = selectedFile.name.replace('.pdf', '');

    setUploading(true);
    try {
      // Verificar duplicados
      const isDuplicate = await checkDuplicateTitle(title);
      if (isDuplicate) {
        alert('Este archivo ya ha sido subido anteriormente');
        setUploading(false);
        return;
      }

      // Upload with preview blobs (this includes uploading 3 preview images)
      console.log('[Upload] Starting upload with', previewBlobs.length, 'preview pages');
      await uploadPDF(selectedFile, user, resourceDescription, selectedAiModel, selectedCategory, originalSource, thumbnailBlob, previewBlobs);
      await loadResources();

      // Reset form
      setShowUploadModal(false);
      setSelectedFile(null);
      setResourceDescription('');
      setAcceptedTerms(false);
      setSelectedAiModel('');
      setSelectedCategory('');
      setOriginalSource('');
      setIsDragging(false);
      setThumbnailBlob(null);
      setThumbnailPreview(null);
      setPreviewBlobs([]);

      alert('PDF subido exitosamente!');
    } catch (error) {
      alert('Error al subir el PDF: ' + error.message);
    } finally {
      setUploading(false);
    }
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

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleCardClick = (resource) => {
    // Navigate to resource page instead of opening modal
    navigate(`/resource/${resource.id}`);
  };

  const handleUpgradeToPro = async () => {
    if (!user) {
      alert('Debes iniciar sesión para actualizar a PRO');
      return;
    }

    try {
      console.log('[Stripe] Initiating upgrade to PRO for user:', user.uid);

      // Call backend to create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const data = await response.json();
      console.log('[Stripe] Checkout session created:', data.sessionId);

      // Redirect to Stripe Checkout using URL (modern approach)
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned from server');
      }
    } catch (error) {
      console.error('[Stripe] Error during upgrade:', error);
      alert('Error al procesar el pago: ' + error.message);
    }
  };

  const handleDownloadFromModal = async () => {
    if (!user) {
      await handleLogin();
      return;
    }

    if (!selectedResource) return;

    // Capture resource before closing modal
    const resourceToDownload = selectedResource;
    const isPro = user.isPro || false;

    // Check download limit for free users
    if (!isPro && downloadsCount >= MAX_DOWNLOADS) {
      setShowLimitModal(true);
      return;
    }

    // CRITICAL: Open PDF FIRST (before any async operations)
    window.open(resourceToDownload.fileUrl, '_blank');

    // Update download count for free users BEFORE closing modal
    if (!isPro) {
      // Calculate new count
      const newCount = downloadsCount + 1;

      // FORCE SYNCHRONOUS state update using flushSync
      flushSync(() => {
        setDownloadsCount(newCount);
      });

      // Save to localStorage
      localStorage.setItem('synapse_downloads_count', newCount.toString());

      // FIX: Increment user download count in Firebase (was missing!)
      incrementUserDownloadCount(user.uid).catch(console.error);

      // Close modal AFTER state update
      setShowPreviewModal(false);
      setSelectedResource(null);

      // Increment Firebase download count for resource (background)
      incrementDownloads(resourceToDownload.id).catch(console.error);

      // Update resources list (background)
      loadResources().catch(console.error);

      // Show notification AFTER state update
      const remaining = MAX_DOWNLOADS - newCount;
      if (remaining > 0) {
        setTimeout(() => {
          alert(`✅ Descarga iniciada. Te quedan ${remaining} descargas gratuitas.`);
        }, 100);
      } else {
        setTimeout(() => {
          alert('¡Has alcanzado tu límite de descargas gratuitas! 🎯\n\nHazte PRO para disfrutar de descargas ilimitadas y apoyar la comunidad.');
        }, 100);
      }
    } else {
      // PRO users: only increment resource download count
      setShowPreviewModal(false);
      setSelectedResource(null);
      incrementDownloads(resourceToDownload.id).catch(console.error);
      loadResources().catch(console.error);
    }
  };

  // =====================================================
  // FIX BUG #2: VALIDACIÓN CRUZADA - Usar SIEMPRE el ID
  // =====================================================
  const handleToggleValidation = (resourceId) => {
    // Validación defensiva: asegurar que tenemos un ID válido
    if (!resourceId || typeof resourceId !== 'string') {
      return;
    }

    if (!user) {
      return;
    }

    setResources(prevResources => {
      return prevResources.map(resource => {
        // Comparación ESTRICTA por ID único
        if (resource.id !== resourceId) {
          return resource;
        }

        // Este ES el recurso correcto - proceder con la validación
        const validatedBy = Array.isArray(resource.validatedBy) ? resource.validatedBy : [];
        const hasValidated = validatedBy.includes(user.uid);
        
        const newValidatedBy = hasValidated
          ? validatedBy.filter(uid => uid !== user.uid)
          : [...validatedBy, user.uid];

        // Background update to Firebase
        (async () => {
          try {
            if (hasValidated) {
              await removeValidation(resourceId, user.uid);
            } else {
              await addValidation(resourceId, user.uid);
            }
          } catch (error) {
            // Silent fail - AdBlocker or network errors don't break UI
          }
        })();

        return { ...resource, validatedBy: newValidatedBy };
      });
    });
  };

  const hasUserValidated = (resource) => {
    if (!user || !resource.validatedBy) return false;
    return resource.validatedBy.includes(user.uid);
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

  const handleToggleFavorite = async (e, resourceId) => {
    e.stopPropagation(); // Evitar que se abra el modal

    if (!user) {
      alert('Debes iniciar sesión para guardar favoritos');
      return;
    }

    try {
      const isFavorite = userFavorites.includes(resourceId);

      if (isFavorite) {
        await removeFromFavorites(user.uid, resourceId);
      } else {
        await addToFavorites(user.uid, resourceId);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      alert('Error al actualizar favoritos');
    }
  };


  // =====================================================
  // FIX BUG MARCADORES: Solo contar favoritos que existen en resources
  // Esto evita el "fantasma" de favoritos huérfanos en Firebase
  // =====================================================
  const validFavorites = useMemo(() => {
    const resourceIds = new Set(resources.map(r => r.id));
    return userFavorites.filter(favId => resourceIds.has(favId));
  }, [resources, userFavorites]);

  // =====================================================
  // FIX: Contador de favoritos ahora viene de validFavorites
  // NO de ningún campo isSaved hardcodeado en los recursos
  // =====================================================
  const filteredResources = useMemo(() => {
    return resources
      .filter(r => {
        // Filtro de búsqueda
        const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.author.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtro de categoría
        const matchesCategory = filterCategory === 'Todas' || r.category === filterCategory;

        // Filtro de favoritos - usar validFavorites (solo IDs que existen)
        if (showOnlyFavorites) {
          return matchesSearch && matchesCategory && validFavorites.includes(r.id);
        }

        return matchesSearch && matchesCategory;
      })
      // Ordenar SOLO por fecha de subida (estable, no cambia con interacciones)
      .sort((a, b) => {
        return (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0);
      });
  }, [resources, searchTerm, filterCategory, showOnlyFavorites, validFavorites]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-xl text-slate-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* SEO - Default Meta Tags for Home */}
      <Helmet>
        <title>Synapse | Tu Biblioteca de IA</title>
        <meta name="description" content="Descubre y comparte resúmenes verificados de Inteligencia Artificial. La comunidad para aprender IA." />
      </Helmet>

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
                {/* PRO badge for PRO users */}
                {(user.isPro || false) && (
                  <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg">
                    <Zap size={16} className="fill-current" />
                    <span className="text-sm font-bold">
                      PRO · Sin límites
                    </span>
                  </div>
                )}

                {/* Download counter for free users - Color coded based on usage */}
                {!(user.isPro || false) && (
                  <button
                    onClick={() => {
                      if (downloadsCount >= MAX_DOWNLOADS) {
                        setShowLimitModal(true);
                      }
                    }}
                    className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full border transition ${
                    downloadsCount >= MAX_DOWNLOADS
                      ? 'bg-red-100 text-red-800 border-red-200 cursor-pointer hover:bg-red-200'
                      : downloadsCount >= 3
                      ? 'bg-orange-100 text-orange-800 border-orange-200 cursor-default'
                      : 'bg-green-100 text-green-800 border-green-200 cursor-default'
                  }`}>
                    <Download size={16} />
                    <span className="text-sm font-semibold">
                      {downloadsCount >= MAX_DOWNLOADS
                        ? 'Hazte PRO para seguir'
                        : downloadsCount >= 3
                        ? `Te quedan ${MAX_DOWNLOADS - downloadsCount}`
                        : `${MAX_DOWNLOADS - downloadsCount} descargas disponibles`}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition"
                >
                  <Upload size={18} />
                  <span className="hidden md:inline">Comparte un hallazgo</span>
                </button>
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full border-2 border-indigo-600"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-100 flex items-center justify-center">
                      <User size={20} className="text-indigo-600" />
                    </div>
                  )}

                  {/* Manage Subscription button - Only for PRO users */}
                  {(user.isPro || false) && (
                    <button
                      onClick={handleManageSubscription}
                      className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition"
                    >
                      <Settings size={16} />
                      Gestionar Suscripción
                    </button>
                  )}

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

        {/* Explanatory Banner */}
        <div className="max-w-2xl mx-auto mb-6">
          <p className="text-gray-600 text-center leading-relaxed">
            Synapse es la biblioteca comunitaria de conocimiento. Accede a resúmenes verificados de fuentes reales, validados por personas como tú.
          </p>
        </div>

        {!user && (
          <p className="text-slate-500 mb-4">
            Inicia sesión para descargar resúmenes verificados por la comunidad
          </p>
        )}
        <div className="max-w-2xl mx-auto relative mb-4">
          <Search className="absolute left-4 top-4 text-slate-400" />
          <input
            className="w-full pl-12 py-4 border-2 rounded-2xl text-lg"
            placeholder="Busca conocimiento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Favorites Filter Button */}
        {user && (
          <div className="max-w-2xl mx-auto flex justify-center mb-6">
            <button
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                showOnlyFavorites
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-indigo-300'
              }`}
            >
              <Bookmark size={20} className={showOnlyFavorites ? 'fill-white' : ''} />
              {showOnlyFavorites ? 'Mi Biblioteca' : 'Mi Biblioteca'}
              {/* Contador usa validFavorites (solo IDs que existen en resources) */}
              {validFavorites.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  showOnlyFavorites ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'
                }`}>
                  {validFavorites.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="max-w-7xl mx-auto px-4 my-6">
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto md:overflow-x-visible scrollbar-hide pb-4 md:flex-wrap md:justify-center">
              {/* "Todas" chip */}
              <button
                onClick={() => setFilterCategory('Todas')}
                className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200 ease-in-out ${
                  filterCategory === 'Todas'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todas
              </button>

              {/* Category chips */}
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCategory(cat.value)}
                  className={`px-5 py-2.5 rounded-full font-medium text-sm whitespace-nowrap transition-all duration-200 ease-in-out ${
                    filterCategory === cat.value
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scroll indicator gradient - Mobile only */}
            <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none md:hidden" />
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredResources.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            {showOnlyFavorites ? (
              <div className="flex flex-col items-center gap-4">
                <Bookmark size={64} className="text-slate-300" />
                <p className="text-xl text-slate-600 font-medium">
                  Aún no has guardado ningún recurso para leer luego
                </p>
                <p className="text-slate-500">
                  Haz clic en el icono de marcador en cualquier recurso para guardarlo aquí
                </p>
                <button
                  onClick={() => setShowOnlyFavorites(false)}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition"
                >
                  Explorar recursos
                </button>
              </div>
            ) : searchTerm ? (
              /* Empty State - Sin resultados de búsqueda */
              <div className="flex flex-col items-center gap-4">
                <div className="text-6xl">🔍</div>
                <p className="text-xl text-slate-700 font-medium text-center">
                  Vaya, no hemos encontrado nada sobre "<span className="text-indigo-600">{searchTerm}</span>"
                </p>
                <p className="text-slate-500 text-center">
                  ¿Crees que falta este tema en la biblioteca?
                </p>
                <a
                  href={`mailto:synapse.app.contact@proton.me?subject=Solicitud de recurso: ${encodeURIComponent(searchTerm)}&body=Hola, me gustaría solicitar un recurso sobre: ${encodeURIComponent(searchTerm)}`}
                  className="mt-2 px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-full font-semibold hover:bg-indigo-50 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Solicitar este Recurso
                </a>
              </div>
            ) : (
              <p className="text-slate-500">
                No hay recursos aún. ¡Sé el primero en compartir!
              </p>
            )}
          </div>
        ) : (
          // =====================================================
          // FIX BUG #2: Renderizado completamente aislado por tarjeta
          // =====================================================
          filteredResources.map((resource) => (
            <ResourceCard
              key={`card-${resource.id}`}
              resource={resource}
              user={user}
              validFavorites={validFavorites}
              onCardClick={handleCardClick}
              onToggleValidation={handleToggleValidation}
              onToggleFavorite={handleToggleFavorite}
              onDeleteResource={handleDeleteResource}
              onLoadPreview={loadPdfPreview}
              getGradient={getGradient}
              getCategoryColor={getCategoryColor}
            />
          ))
        )}
      </main>


      {/* PDF Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center z-10 rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Vista Previa</h2>
                <p className="text-sm text-slate-600 mt-1">Primeras 3 páginas del documento</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-900 transition"
              >
                <X size={28} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 px-8">
              {loadingPreview ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-slate-600">Cargando vista previa...</p>
                </div>
              ) : previewPages.length === 0 ? (
                /* Fallback error state */
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4 mx-auto">
                    <FileText className="text-amber-600" size={40} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Vista previa no disponible
                  </h3>
                  <p className="text-slate-600 mb-6 max-w-md mx-auto">
                    No pudimos generar la vista previa para este documento. Puedes descargarlo directamente para ver su contenido completo.
                  </p>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      handleDownloadFromModal();
                    }}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition inline-flex items-center gap-2"
                  >
                    <Download size={20} />
                    Descargar Documento
                  </button>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {previewPages.map((pageUrl, index) => (
                    <div key={index} className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                      <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                        <p className="text-sm font-semibold text-slate-700">Página {index + 1}</p>
                      </div>
                      <img
                        src={pageUrl}
                        alt={`Página ${index + 1}`}
                        className="w-full rounded-b-xl"
                      />
                    </div>
                  ))}

                  {/* CTA to download */}
                  <div className="text-center pt-4">
                    <p className="text-slate-600 mb-4">¿Te interesa? Descarga el documento completo</p>
                    <button
                      onClick={() => {
                        setShowPreviewModal(false);
                        handleDownloadFromModal();
                      }}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-full font-bold hover:bg-indigo-700 transition inline-flex items-center gap-2"
                    >
                      <Download size={20} />
                      Descargar PDF Gratis
                    </button>
                  </div>
                </div>
              )}
            </div>
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
              <X size={24} />
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
              onClick={handleUpgradeToPro}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
            >
              Actualizar a PRO - 4.99€/mes
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

      {/* Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 z-40"
          title="Volver arriba"
        >
          <ArrowUp size={24} />
        </button>
      )}

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-center sm:text-left">
              Utilizamos cookies para mejorar tu experiencia. Al continuar navegando, aceptas nuestra política de cookies.
            </p>
            <button
              onClick={handleCloseCookieBanner}
              className="px-6 py-2 bg-indigo-600 text-white rounded-full font-semibold hover:bg-indigo-700 transition whitespace-nowrap"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center rounded-t-3xl z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Compartir Recurso</h2>
                <p className="text-sm text-slate-600 mt-1">Sube un PDF para compartir con la comunidad</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-900 transition p-2"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 pt-4">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center mb-6 transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50'
                  : selectedFile
                    ? 'border-green-400 bg-green-50'
                    : 'border-slate-300 hover:border-indigo-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {generatingThumbnail ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                  <p className="text-slate-600">Generando vista previa...</p>
                </div>
              ) : selectedFile ? (
                <div className="flex flex-col items-center gap-4">
                  {thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Preview"
                      className="w-32 h-40 object-cover rounded-lg shadow-md border-2 border-white"
                    />
                  ) : (
                    <FileText className="text-green-600" size={48} />
                  )}
                  <div>
                    <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setThumbnailBlob(null);
                      setThumbnailPreview(null);
                      setPreviewBlobs([]);
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                  <p className="text-slate-600 mb-2">Arrastra tu PDF aquí o</p>
                  <label className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-full cursor-pointer hover:bg-indigo-700 transition">
                    Seleccionar archivo
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-500 mt-4">Solo archivos PDF, máximo 10MB</p>
                </>
              )}
            </div>

            {/* Description Input */}
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={resourceDescription}
                onChange={(e) => setResourceDescription(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Describe brevemente este recurso para ayudar a otros a entender su valor... (mínimo 10 caracteres)"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
                  resourceDescription.length > 0 && resourceDescription.length < 10
                    ? 'border-red-300 bg-red-50'
                    : 'border-slate-300'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                <p className={`text-xs ${
                  resourceDescription.length > 0 && resourceDescription.length < 10
                    ? 'text-red-500'
                    : 'text-slate-500'
                }`}>
                  {resourceDescription.length < 10 && resourceDescription.length > 0
                    ? `Faltan ${10 - resourceDescription.length} caracteres`
                    : resourceDescription.length >= 10
                    ? '✓ Descripción válida'
                    : 'Mínimo 10 caracteres'
                  }
                </p>
                <p className="text-xs text-slate-500">
                  {resourceDescription.length}/300
                </p>
              </div>
            </div>

            {/* Grid 2 columns: Category and AI Model */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Category Selector */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    !selectedCategory
                      ? 'border-slate-300 text-slate-500'
                      : 'border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="" disabled>Selecciona</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Model Selector */}
              <div>
                <label htmlFor="ai-model" className="block text-sm font-semibold text-slate-700 mb-2">
                  Generado por <span className="text-red-500">*</span>
                </label>
                <select
                  id="ai-model"
                  value={selectedAiModel}
                  onChange={(e) => setSelectedAiModel(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    !selectedAiModel
                      ? 'border-slate-300 text-slate-500'
                      : 'border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="" disabled>Selecciona</option>
                  {aiModels.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Original Source Input */}
            <div className="mb-4">
              <label htmlFor="original-source" className="block text-sm font-semibold text-slate-700 mb-2">
                Fuente Original <span className="text-red-500">*</span>
              </label>
              <input
                id="original-source"
                type="text"
                value={originalSource}
                onChange={(e) => setOriginalSource(e.target.value)}
                maxLength={SOURCE_MAX_LENGTH}
                placeholder="Ej: Manual DGT 2025, Libro de Marketing de Kotler, BOE..."
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  !originalSource
                    ? 'border-slate-300'
                    : 'border-slate-300'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-slate-500">
                  Indica en qué se basa este contenido para garantizar su veracidad.
                </p>
                <p className={`text-xs font-semibold ${
                  originalSource.length > SOURCE_MAX_LENGTH * 0.9
                    ? 'text-amber-600'
                    : originalSource.length > SOURCE_MAX_LENGTH * 0.7
                      ? 'text-blue-600'
                      : 'text-slate-400'
                }`}>
                  {originalSource.length}/{SOURCE_MAX_LENGTH}
                </p>
              </div>
            </div>

            {/* Legal Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl mb-6">
              <input
                type="checkbox"
                id="terms-checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="terms-checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                Certifico que tengo los derechos para compartir este documento y que es un contenido original o de libre distribución. Acepto que Synapse es una plataforma comunitaria y no propietaria del contenido.
              </label>
            </div>

            {/* Publish Button */}
            <button
              onClick={handlePublishResource}
              disabled={!selectedFile || resourceDescription.length < 10 || !acceptedTerms || !selectedAiModel || !selectedCategory || !originalSource.trim() || uploading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition flex items-center justify-center gap-3 ${
                !selectedFile || resourceDescription.length < 10 || !acceptedTerms || !selectedAiModel || !selectedCategory || !originalSource.trim() || uploading
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {uploading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  Subiendo vistas previas...
                </>
              ) : (
                <>
                  <Upload size={24} />
                  Publicar Recurso
                </>
              )}
            </button>

            {/* Validation Message */}
            {(!selectedFile || resourceDescription.length < 10 || !acceptedTerms || !selectedAiModel || !selectedCategory || !originalSource.trim()) && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800 font-medium">
                  Para publicar necesitas:
                </p>
                <ul className="text-xs text-amber-700 mt-2 space-y-1 ml-4">
                  {!selectedFile && <li>• Seleccionar un archivo PDF</li>}
                  {resourceDescription.length < 10 && <li>• Escribir una descripción (mín. 10 caracteres)</li>}
                  {!selectedCategory && <li>• Seleccionar una categoría</li>}
                  {!selectedAiModel && <li>• Seleccionar quién generó el contenido</li>}
                  {!originalSource.trim() && <li>• Indicar la fuente original</li>}
                  {!acceptedTerms && <li>• Aceptar los términos legales</li>}
                </ul>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Cookie Consent Banner - GDPR */}
      <CookieBanner />
    </div>
  );
}