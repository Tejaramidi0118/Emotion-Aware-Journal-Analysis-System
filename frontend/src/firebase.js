import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

const firebaseConfig = {

  apiKey: "AIzaSyBugGJ0YdqNDm7Hlbv1Y2VlAewr72Q0lrY",

  authDomain: "echomind-ai-2026.firebaseapp.com",

  projectId: "echomind-ai-2026",

  storageBucket: "echomind-ai-2026.firebasestorage.app",

  messagingSenderId: "1044891723640",

  appId: "1:1044891723640:web:4075c3c3768db9990f8a8d",

  measurementId: "G-V6NBWB44ZH"

};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = () =>
  signInWithPopup(auth, provider);