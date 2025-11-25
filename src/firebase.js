import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";   // ⬅ add this

const firebaseConfig = {
  apiKey: "AIzaSyAM_mYgzuiJoSVvmRvc0UGCRQK-LDhiNd8",
  authDomain: "life-sos-hfd.firebaseapp.com",
  projectId: "life-sos-hfd",
  storageBucket: "life-sos-hfd.firebasestorage.app",
  messagingSenderId: "75238246606",
  appId: "1:75238246606:web:d656124c28ed712a3c289f",
  measurementId: "G-86T5NE58FJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);          // ⬅ export storage
