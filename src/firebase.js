import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBjxP6gQPJiepK8fUCpSoW4t4L4M8xzklc",
  authDomain: "dars-khososy.firebaseapp.com",
  projectId: "dars-khososy",
  storageBucket: "dars-khososy.firebasestorage.app",
  messagingSenderId: "351316714131",
  appId: "1:351316714131:web:6d046ac37ca5513b6f6366",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);