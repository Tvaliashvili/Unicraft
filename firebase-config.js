// ========================================
// FIREBASE კონფიგურაცია
// ========================================
// 1. გადადი: https://console.firebase.google.com
// 2. "Add project" → სახელი (მაგ: elavia-shop)
// 3. Project Settings → "Add app" → Web (</>)
// 4. დაკოპირე შენი config და ჩაანაცვლე ქვემოთ:

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "შენი-API-KEY",
  authDomain: "შენი-PROJECT.firebaseapp.com",
  projectId: "შენი-PROJECT-ID",
  storageBucket: "შენი-PROJECT.appspot.com",
  messagingSenderId: "შენი-SENDER-ID",
  appId: "შენი-APP-ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
