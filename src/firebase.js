import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";   // ⬅ add this

const firebaseConfig = {
  apiKey: "AIzaSyDHEkhTZ1oyH3ioJAhx9i5TOFeLaSy8bGs",
  authDomain: "life-sos-97f85.firebaseapp.com",
  projectId: "life-sos-97f85",
  storageBucket: "life-sos-97f85.firebasestorage.app",
  messagingSenderId: "403581591580",
  appId: "1:403581591580:web:20cde865409a913681bfd9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);          // ⬅ export storage
