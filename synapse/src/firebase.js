import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment, serverTimestamp, query, orderBy, getDoc, where, deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCAWeFY4aRK6uIVBBKMlEH48mmO1pDzWU8",
  authDomain: "synapse-app-c07c0.firebaseapp.com",
  projectId: "synapse-app-c07c0",
  storageBucket: "synapse-app-c07c0.firebasestorage.app",
  messagingSenderId: "248897477122",
  appId: "1:248897477122:web:b55245c195eebde85b651b",
  measurementId: "G-SF6DME427R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Helper Functions

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

export const uploadPDF = async (file, user, description = '', aiModel = 'NotebookLM', category = 'Otros', originalSource = '', thumbnailBlob = null, previewBlobs = []) => {
  try {
    const timestamp = Date.now();

    // Upload file to Storage
    const storageRef = ref(storage, `pdfs/${timestamp}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(snapshot.ref);

    // Upload thumbnail if available
    let thumbnailUrl = null;
    if (thumbnailBlob) {
      try {
        const thumbnailRef = ref(storage, `thumbnails/${timestamp}_${file.name.replace('.pdf', '')}.jpg`);
        const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailBlob);
        thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
      } catch (thumbError) {
        console.warn('Failed to upload thumbnail, continuing without it:', thumbError);
        // Continue without thumbnail
      }
    }

    // Upload preview pages (up to 3 pages)
    const previewUrls = [];
    if (previewBlobs && previewBlobs.length > 0) {
      console.log(`[Upload] Uploading ${previewBlobs.length} preview pages...`);
      for (let i = 0; i < previewBlobs.length; i++) {
        try {
          const previewRef = ref(storage, `previews/${timestamp}_${file.name.replace('.pdf', '')}_page${i + 1}.jpg`);
          const previewSnapshot = await uploadBytes(previewRef, previewBlobs[i]);
          const previewUrl = await getDownloadURL(previewSnapshot.ref);
          previewUrls.push(previewUrl);
          console.log(`[Upload] Preview page ${i + 1} uploaded successfully`);
        } catch (previewError) {
          console.warn(`Failed to upload preview page ${i + 1}:`, previewError);
          // Continue without this preview page
        }
      }
    }

    // Generate unique avatar seed (fallback for old resources)
    const avatarSeed = `${timestamp}-${Math.random().toString(36).substring(7)}`;
    const avatarUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${avatarSeed}`;

    // Save metadata to Firestore
    const docRef = await addDoc(collection(db, 'resources'), {
      title: file.name.replace('.pdf', ''),
      author: user.displayName || 'Anonymous',
      downloads: 0,
      aiModel: aiModel,
      fileUrl: fileUrl,
      uploadedAt: serverTimestamp(),
      userId: user.uid,
      userPhoto: user.photoURL || '',
      validatedBy: [], // Array de UIDs que han validado
      avatarUrl: avatarUrl, // Fallback for old resources
      thumbnailUrl: thumbnailUrl, // New: actual PDF thumbnail (page 1)
      previewUrls: previewUrls, // NEW: Array of preview URLs (pages 1-3)
      description: description || '',
      category: category,
      originalSource: originalSource
    });

    console.log(`[Upload] Resource created with ${previewUrls.length} preview pages`);
    return { id: docRef.id, fileUrl };
  } catch (error) {
    console.error("Error uploading PDF:", error);
    throw error;
  }
};

export const getPDFs = async () => {
  try {
    const q = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const pdfs = [];
    querySnapshot.forEach((doc) => {
      pdfs.push({ id: doc.id, ...doc.data() });
    });
    return pdfs;
  } catch (error) {
    console.error("Error getting PDFs:", error);
    throw error;
  }
};

export const incrementDownloads = async (resourceId) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    await updateDoc(docRef, {
      downloads: increment(1)
    });
  } catch (error) {
    console.error("Error incrementing downloads:", error);
    throw error;
  }
};

export const addValidation = async (resourceId, userId) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Resource not found');
    }

    const data = docSnap.data();
    const validatedBy = data.validatedBy || [];

    // Si el usuario ya validó, no hacer nada
    if (validatedBy.includes(userId)) {
      return { validatedBy };
    }

    // Añadir validación
    const newValidatedBy = [...validatedBy, userId];

    await updateDoc(docRef, {
      validatedBy: newValidatedBy
    });

    return { validatedBy: newValidatedBy };
  } catch (error) {
    console.error("Error adding validation:", error);
    throw error;
  }
};

export const removeValidation = async (resourceId, userId) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Resource not found');
    }

    const data = docSnap.data();
    const validatedBy = data.validatedBy || [];

    // Remover validación del usuario
    const newValidatedBy = validatedBy.filter(uid => uid !== userId);

    await updateDoc(docRef, {
      validatedBy: newValidatedBy
    });

    return { validatedBy: newValidatedBy };
  } catch (error) {
    console.error("Error removing validation:", error);
    throw error;
  }
};

export const checkDuplicateTitle = async (title) => {
  try {
    const q = query(collection(db, 'resources'), where('title', '==', title));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // Retorna true si ya existe
  } catch (error) {
    console.error("Error checking duplicate:", error);
    throw error;
  }
};

export const deleteResource = async (resourceId, fileUrl) => {
  try {
    // Eliminar documento de Firestore
    await deleteDoc(doc(db, 'resources', resourceId));

    // Eliminar archivo de Storage
    // Extraer la ruta del archivo desde la URL
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);

    return true;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};

// ============================================
// FAVORITES MANAGEMENT
// ============================================

export const addToFavorites = async (userId, resourceId) => {
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', resourceId);
    await setDoc(favoriteRef, {
      savedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error adding to favorites:", error);
    throw error;
  }
};

export const removeFromFavorites = async (userId, resourceId) => {
  try {
    const favoriteRef = doc(db, 'users', userId, 'favorites', resourceId);
    await deleteDoc(favoriteRef);
    return true;
  } catch (error) {
    console.error("Error removing from favorites:", error);
    throw error;
  }
};

export const getUserFavorites = async (userId) => {
  try {
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const querySnapshot = await getDocs(favoritesRef);
    const favorites = [];
    querySnapshot.forEach((doc) => {
      favorites.push(doc.id); // Solo guardamos los IDs de los recursos
    });
    return favorites;
  } catch (error) {
    console.error("Error getting favorites:", error);
    throw error;
  }
};

export const subscribeToFavorites = (userId, callback) => {
  const favoritesRef = collection(db, 'users', userId, 'favorites');
  return onSnapshot(favoritesRef, (snapshot) => {
    const favorites = [];
    snapshot.forEach((doc) => {
      favorites.push(doc.id);
    });
    callback(favorites);
  });
};

// ============================================
// DOWNLOAD LIMITS (FREEMIUM)
// ============================================

export const getUserDownloadCount = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create user document if doesn't exist
      await setDoc(userRef, {
        downloadsCount: 0,
        createdAt: serverTimestamp()
      });
      return 0;
    }

    const data = userSnap.data();
    return data.downloadsCount || 0;
  } catch (error) {
    console.error("Error getting download count:", error);
    throw error;
  }
};

export const incrementUserDownloadCount = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Create user document with count 1
      await setDoc(userRef, {
        downloadsCount: 1,
        lastDownloadAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
    } else {
      // Increment existing count
      await updateDoc(userRef, {
        downloadsCount: increment(1),
        lastDownloadAt: serverTimestamp()
      });
    }

    return true;
  } catch (error) {
    console.error("Error incrementing download count:", error);
    throw error;
  }
};
