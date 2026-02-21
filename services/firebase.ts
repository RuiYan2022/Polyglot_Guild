
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAGTfpFkImja67DJJb5SOYdEL3J_lG_M94",
  authDomain: "academy-guild-model.firebaseapp.com",
  projectId: "academy-guild-model",
  storageBucket: "academy-guild-model.firebasestorage.app",
  messagingSenderId: "376466097359",
  appId: "1:376466097359:web:7bab72e5d6501eefdf23ba",
  measurementId: "G-S4ENYD4KWR"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;

console.log("Academy Model: Firebase initialized for project:", firebaseConfig.projectId);
