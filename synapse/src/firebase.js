import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, increment, serverTimestamp, query, orderBy, getDoc, where, deleteDoc } from 'firebase/firestore';
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

export const uploadPDF = async (file, user) => {
  try {
    // Upload file to Storage
    const storageRef = ref(storage, `pdfs/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const fileUrl = await getDownloadURL(snapshot.ref);

    // Generate unique avatar seed
    const avatarSeed = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const avatarUrl = `https://api.dicebear.com/9.x/shapes/svg?seed=${avatarSeed}`;

    // Save metadata to Firestore
    const docRef = await addDoc(collection(db, 'resources'), {
      title: file.name.replace('.pdf', ''),
      author: user.displayName || 'Anonymous',
      downloads: 0,
      aiModel: 'NotebookLM',
      fileUrl: fileUrl,
      uploadedAt: serverTimestamp(),
      userId: user.uid,
      userPhoto: user.photoURL || '',
      ratings: [], // Array de { userId, rating }
      averageRating: 0,
      totalRatings: 0,
      avatarUrl: avatarUrl
    });

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

export const rateResource = async (resourceId, userId, rating) => {
  try {
    const docRef = doc(db, 'resources', resourceId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Resource not found');
    }

    const data = docSnap.data();
    const ratings = data.ratings || [];

    // Buscar si el usuario ya valoró
    const existingRatingIndex = ratings.findIndex(r => r.userId === userId);

    let newRatings;
    if (existingRatingIndex >= 0) {
      // Actualizar valoración existente
      newRatings = [...ratings];
      newRatings[existingRatingIndex] = { userId, rating };
    } else {
      // Añadir nueva valoración
      newRatings = [...ratings, { userId, rating }];
    }

    // Calcular promedio
    const totalRatings = newRatings.length;
    const sumRatings = newRatings.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;

    await updateDoc(docRef, {
      ratings: newRatings,
      averageRating: averageRating,
      totalRatings: totalRatings
    });

    return { averageRating, totalRatings };
  } catch (error) {
    console.error("Error rating resource:", error);
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
