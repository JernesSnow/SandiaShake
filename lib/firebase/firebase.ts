import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCEo2NZ9_R-x25muFZCtxw_b2s6_DJ-AF8",
  authDomain: "sandia-con-chile.firebaseapp.com",
  projectId: "sandia-con-chile",
  storageBucket: "sandia-con-chile.firebasestorage.app",
  messagingSenderId: "556205450409",
  appId: "1:556205450409:web:9e45c24c6023fe9459f5b8",
  measurementId: "G-35C1KBZ6YD",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export async function getFirebaseMessaging() {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(firebaseApp);
}