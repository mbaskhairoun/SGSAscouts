// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATW5HErUw05Ij28L6974sR12lVO8Av_ew",
  authDomain: "sgsa-kids.firebaseapp.com",
  databaseURL: "https://sgsa-kids-default-rtdb.firebaseio.com",
  projectId: "sgsa-kids",
  storageBucket: "sgsa-kids.firebasestorage.app",
  messagingSenderId: "988633336020",
  appId: "1:988633336020:web:f9f2055d4dd7996ad51341",
  measurementId: "G-X98HHTS026"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };