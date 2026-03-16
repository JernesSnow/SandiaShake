"use client";

import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";

export async function requestNotificationPermissionAndToken() {
  if (typeof window === "undefined") {
    console.log("No window");
    return null;
  }

  console.log("Notification in window?", "Notification" in window);

  const permission = await Notification.requestPermission();
  console.log("Notification permission:", permission);

  if (permission !== "granted") return null;

  const messaging = await getFirebaseMessaging();
  console.log("messaging:", messaging);

  if (!messaging) return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("Falta NEXT_PUBLIC_FIREBASE_VAPID_KEY");
  }

  const token = await getToken(messaging, { vapidKey });
  console.log("Generated token:", token);

  return token || null;
}

export async function subscribeToForegroundMessages(
  callback: (payload: unknown) => void
) {
  const messaging = await getFirebaseMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    callback(payload);
  });
}