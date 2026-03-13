import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDsZ5WjFUE77UQZ5w3DSiL3KNv0whAkxAo",
  authDomain: "watami-push.firebaseapp.com",
  projectId: "watami-push",
  storageBucket: "watami-push.firebasestorage.app",
  messagingSenderId: "94917828787",
  appId: "1:94917828787:web:ccd19f2feca73a287890c6",
  measurementId: "G-LHHL9JEYSJ"
};

const VAPID_KEY = "BCufpq1jxXcMqo0vU2VRSM981NeOg81rTtkKVjQfWsS0qEHqN5fzsWHShb299kep7ctg8OQVmXR1KKTvAopTs2w";

const app = initializeApp(firebaseConfig);

export const requestFCMToken = async () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "";
  if (!("serviceWorker" in navigator)) return "";
  if (!("Notification" in window)) return "";

  const supported = await isSupported().catch(() => false);
  if (!supported) return "";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "";

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });

  return token || "";
};

export { app };
