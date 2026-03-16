importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCEo2NZ9_R-x25muFZCtxw_b2s6_DJ-AF8",
  authDomain: "sandia-con-chile.firebaseapp.com",
  projectId: "sandia-con-chile",
  storageBucket: "sandia-con-chile.firebasestorage.app",
  messagingSenderId: "556205450409",
  appId: "1:556205450409:web:9e45c24c6023fe9459f5b8",
  measurementId: "G-35C1KBZ6YD",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "SandiaShake";

  const options = {
    body: payload.notification?.body || "",
    icon: "/mock-logo-sandia-con-chole.png",
  };

  self.registration.showNotification(title, options);
});