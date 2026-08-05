// Firebase SDK Initialization & Reactive Local State Provider
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  where
} from 'firebase/firestore';

// Default Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA19YKhRmeoTuqTMgCrtDYaHn98ivoVYTU",
  authDomain: "dr-abdul-rouf-physio.firebaseapp.com",
  projectId: "dr-abdul-rouf-physio",
  storageBucket: "dr-abdul-rouf-physio.firebasestorage.app",
  messagingSenderId: "236972259708",
  appId: "1:236972259708:web:2273b46afca6df862dccf9",
  measurementId: "G-ZMW7PEN81W"
};

let app, auth, db;
let isFirebaseConnected = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isFirebaseConnected = true;
  console.log("Firebase initialized successfully.");
} catch (e) {
  console.warn("Firebase initialized in hybrid state fallback mode:", e.message);
}

// Global state keys for local persistent storage engine
const LOCAL_STORAGE_USERS = 'dr_rouf_users_v2';
const LOCAL_STORAGE_APPOINTMENTS = 'dr_rouf_appointments_v2';
const LOCAL_STORAGE_QUESTIONS = 'dr_rouf_questions_v2';
const LOCAL_STORAGE_REVIEWS = 'dr_rouf_reviews_v2';
const LOCAL_STORAGE_SESSION = 'dr_rouf_session_v2';

// Seed initial demo data for realistic user experience
function seedInitialData() {
  if (!localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS)) {
    const sampleAppointments = [
      {
        id: 'apt_101',
        patientName: 'Muhammad Ahmad',
        patientPhone: '03001234567',
        patientEmail: 'ahmad@example.com',
        date: '2026-07-28',
        timeSlot: '05:00 PM',
        issue: 'Severe lower back pain & sciatica stiffness',
        fee: 1000,
        status: 'Approved',
        createdAt: new Date().toISOString()
      },
      {
        id: 'apt_102',
        patientName: 'Zainab Bibi',
        patientPhone: '03219876543',
        patientEmail: 'zainab@example.com',
        date: '2026-07-28',
        timeSlot: '07:30 PM',
        issue: 'Post-knee surgery rehabilitation therapy',
        fee: 1000,
        status: 'Pending',
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS, JSON.stringify(sampleAppointments));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_QUESTIONS)) {
    const sampleQuestions = [
      {
        id: 'q_201',
        patientName: 'Ali Raza',
        patientEmail: 'ali@example.com',
        question: 'Doctor, I have neck pain while working on laptop. What exercises should I do?',
        answer: 'Hello Ali. Perform gentle chin tucks and shoulder blade squeezes every 45 mins. Keep monitor at eye level. If pain persists, visit AR Physio Care for a posture session.',
        answeredAt: '2026-07-27 06:15 PM',
        createdAt: new Date().toISOString()
      },
      {
        id: 'q_202',
        patientName: 'Saima Khan',
        patientEmail: 'saima@example.com',
        question: 'Is 1000 RS fee applicable for spinal manipulation session as well?',
        answer: null,
        answeredAt: null,
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS, JSON.stringify(sampleQuestions));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_REVIEWS)) {
    const sampleReviews = [
      {
        id: 'rev_301',
        patientName: 'Usman Ghani',
        rating: 5,
        review: 'Extremely professional doctor at AR Physio Care. My chronic back pain was relieved after 3 sessions!',
        createdAt: '2026-07-25'
      },
      {
        id: 'rev_302',
        patientName: 'Fatima Tariq',
        rating: 5,
        review: 'Best physical therapy clinic in Satellite Town Gujranwala. Very attentive care by Dr. Abdul Rouf.',
        createdAt: '2026-07-26'
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_REVIEWS, JSON.stringify(sampleReviews));
  }

  if (!localStorage.getItem(LOCAL_STORAGE_USERS)) {
    const sampleUsers = [
      {
        email: 'roufag930@gmail.com',
        name: 'Dr. Abdul Rouf',
        role: 'doctor'
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(sampleUsers));
  }
}

seedInitialData();

// Helper Functions for Data Operations
export function getCurrentSession() {
  const session = localStorage.getItem(LOCAL_STORAGE_SESSION);
  return session ? JSON.parse(session) : null;
}

export function setCurrentSession(user) {
  if (user) {
    localStorage.setItem(LOCAL_STORAGE_SESSION, JSON.stringify(user));
  } else {
    localStorage.removeItem(LOCAL_STORAGE_SESSION);
  }
}

// User Authentication (Firebase Auth + Fallback)
export async function registerUser(email, password, name, phone) {
  const isDoctor = (email.toLowerCase().trim() === 'roufag930@gmail.com');
  const role = isDoctor ? 'doctor' : 'patient';
  const userData = { email: email.toLowerCase().trim(), name, phone, role };

  if (isFirebaseConnected && auth) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, 'users'), { ...userData, uid: userCredential.user.uid });
    } catch (err) {
      console.warn("Firebase register notice:", err.message);
    }
  }

  const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS) || '[]');
  const existing = users.find(u => u.email === userData.email);
  if (!existing) {
    users.push({ ...userData, password });
    localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(users));
  }

  setCurrentSession(userData);
  return userData;
}

export async function loginUser(email, password) {
  const cleanEmail = email.toLowerCase().trim();
  const isAdminCredentials = (cleanEmail === 'roufag930@gmail.com' && password === 'rouf@663');
  
  let userData = null;

  if (isAdminCredentials) {
    userData = {
      email: 'roufag930@gmail.com',
      name: 'Dr. Abdul Rouf',
      role: 'doctor',
      phone: '03424437289'
    };
    setCurrentSession(userData);
    return userData;
  }

  if (isFirebaseConnected && auth) {
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      userData = {
        email: userCred.user.email,
        name: userCred.user.displayName || email.split('@')[0],
        role: userCred.user.email === 'roufag930@gmail.com' ? 'doctor' : 'patient'
      };
    } catch (e) {
      console.warn("Firebase signin check fallback...");
    }
  }

  if (!userData) {
    const users = JSON.parse(localStorage.getItem(LOCAL_STORAGE_USERS) || '[]');
    const match = users.find(u => u.email === cleanEmail && u.password === password);
    if (match) {
      userData = {
        email: match.email,
        name: match.name,
        phone: match.phone || '',
        role: match.role || 'patient'
      };
    } else {
      throw new Error("Invalid email or password. Please check your credentials.");
    }
  }

  setCurrentSession(userData);
  return userData;
}

// Real Google OAuth Authentication
export async function loginWithGoogle() {
  if (isFirebaseConnected && auth) {
    try {
      const provider = new GoogleAuthProvider();
      // Forces Google to show the account picker window listing all Google accounts on device
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isDoctor = (user.email.toLowerCase().trim() === 'roufag930@gmail.com');
      
      const userData = {
        email: user.email,
        name: user.displayName || user.email.split('@')[0],
        photoURL: user.photoURL || '',
        role: isDoctor ? 'doctor' : 'patient'
      };

      // Store authenticated Google user in Firestore
      try {
        if (db) await addDoc(collection(db, 'users'), { ...userData, uid: user.uid });
      } catch (e) {}

      setCurrentSession(userData);
      return userData;
    } catch (e) {
      console.error("Google Sign-In Firebase Error:", e.code, e.message);
      // Re-throw original Firebase error code so UI can show specific messages
      const err = new Error(e.message || "Google Authentication failed.");
      err.code = e.code; // preserve e.g. 'auth/unauthorized-domain'
      throw err;
    }
  } else {
    throw new Error("Firebase Auth is not connected. Please check your internet connection.");
  }
}

export async function logoutUser() {
  if (isFirebaseConnected && auth) {
    try { await signOut(auth); } catch (e) {}
  }
  setCurrentSession(null);
}

// Appointment Management
export async function createAppointment(appointmentData) {
  const newApt = {
    id: 'apt_' + Date.now(),
    fee: 1000,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    ...appointmentData
  };

  if (isFirebaseConnected && db) {
    try {
      await addDoc(collection(db, 'appointments'), newApt);
    } catch (e) {}
  }

  const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS) || '[]');
  list.unshift(newApt);
  localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS, JSON.stringify(list));
  return newApt;
}

export async function getAppointments() {
  let list = [];
  if (isFirebaseConnected && db) {
    try {
      const q = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => list.push({ firebaseId: doc.id, ...doc.data() }));
    } catch (e) {}
  }

  if (list.length === 0) {
    list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS) || '[]');
  }
  return list;
}

export async function updateAppointmentStatus(id, newStatus) {
  // Update local storage
  const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_APPOINTMENTS) || '[]');
  const item = list.find(a => a.id === id);
  if (item) {
    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_STORAGE_APPOINTMENTS, JSON.stringify(list));
  }

  // Also update in Firebase Firestore
  if (isFirebaseConnected && db) {
    try {
      const q = query(collection(db, 'appointments'), where('id', '==', id));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (docSnap) => {
        await updateDoc(doc(db, 'appointments', docSnap.id), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn('Firebase status update error:', e.message);
    }
  }
  return true;
}


// Q&A Management
export async function createQuestion(patientName, patientEmail, questionText) {
  const newQ = {
    id: 'q_' + Date.now(),
    patientName,
    patientEmail,
    question: questionText,
    answer: null,
    answeredAt: null,
    createdAt: new Date().toISOString()
  };

  if (isFirebaseConnected && db) {
    try {
      await addDoc(collection(db, 'questions'), newQ);
    } catch (e) {}
  }

  const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_QUESTIONS) || '[]');
  list.unshift(newQ);
  localStorage.setItem(LOCAL_STORAGE_QUESTIONS, JSON.stringify(list));
  return newQ;
}

export async function getQuestions() {
  let list = [];
  if (isFirebaseConnected && db) {
    try {
      const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => list.push({ firebaseId: doc.id, ...doc.data() }));
    } catch (e) {}
  }

  if (list.length === 0) {
    list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_QUESTIONS) || '[]');
  }
  return list;
}

export async function answerQuestion(id, answerText) {
  const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_QUESTIONS) || '[]');
  const item = list.find(q => q.id === id);
  if (item) {
    item.answer = answerText;
    item.answeredAt = new Date().toLocaleString();
    localStorage.setItem(LOCAL_STORAGE_QUESTIONS, JSON.stringify(list));
  }
  return true;
}

// Patient Reviews Management
export async function createReview(patientName, rating, reviewText) {
  const newRev = {
    id: 'rev_' + Date.now(),
    patientName,
    rating,
    review: reviewText,
    createdAt: new Date().toISOString().split('T')[0]
  };

  if (isFirebaseConnected && db) {
    try {
      await addDoc(collection(db, 'reviews'), newRev);
    } catch (e) {}
  }

  const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REVIEWS) || '[]');
  list.unshift(newRev);
  localStorage.setItem(LOCAL_STORAGE_REVIEWS, JSON.stringify(list));
  return newRev;
}

export async function getReviews() {
  let list = [];
  if (isFirebaseConnected && db) {
    try {
      const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      snapshot.forEach(doc => list.push({ firebaseId: doc.id, ...doc.data() }));
    } catch (e) {}
  }

  if (list.length === 0) {
    list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REVIEWS) || '[]');
  }
  return list;
}
