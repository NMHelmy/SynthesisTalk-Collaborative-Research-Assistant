// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDatizZ_06Iaht_5AgKsPnwRabK4li6h7Q",
  authDomain: "synthesistalk-99f36.firebaseapp.com",
  projectId: "synthesistalk-99f36",
  appId: "1:940389628309:web:5451925d3bec8f8f6bde9c",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
