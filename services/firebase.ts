
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * FIREBASE SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project and a Web App.
 * 3. Copy the 'firebaseConfig' object provided by Firebase.
 * 4. Paste those values below.
 */
const firebaseConfig = {
  apiKey: "AIzaSyAGTfpFkImja67DJJb5SOYdEL3J_lG_M94",
  authDomain: "academy-guild-model.firebaseapp.com",
  projectId: "academy-guild-model",
  storageBucket: "academy-guild-model.firebasestorage.app",
  messagingSenderId: "376466097359",
  appId: "1:376466097359:web:7bab72e5d6501eefdf23ba",
  measurementId: "G-S4ENYD4KWR"
};

const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Helper for debugging connectivity
console.log("Academy Model: Firebase initialized for project:", firebaseConfig.projectId);