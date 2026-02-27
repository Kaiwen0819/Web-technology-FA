import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_lP1Fy3ksHObImAmXurXSC7oKU7sQrzs",
  authDomain: "web-tech-final-assignment.firebaseapp.com",
  projectId: "web-tech-final-assignment",
  storageBucket: "web-tech-final-assignment.firebasestorage.app",
  messagingSenderId: "1037773460294",
  appId: "1:1037773460294:web:4a238e699783c77050cb47",
  measurementId: "G-QBMZGDC8ZY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);