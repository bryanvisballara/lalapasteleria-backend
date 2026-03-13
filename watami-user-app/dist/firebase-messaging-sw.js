importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDsZ5WjFUE77UQZ5w3DSiL3KNv0whAkxAo",
  authDomain: "watami-push.firebaseapp.com",
  projectId: "watami-push",
  storageBucket: "watami-push.firebasestorage.app",
  messagingSenderId: "94917828787",
  appId: "1:94917828787:web:ccd19f2feca73a287890c6"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload?.notification?.title || payload?.data?.title || "Lala Pasteleria";
  const targetLink = payload?.fcmOptions?.link || payload?.data?.link || "/";
  const notificationOptions = {
    body: payload?.notification?.body || payload?.data?.subtitle || "Tienes una actualización de tu pedido",
    icon: "/assets/logoicono.png",
    badge: "/assets/logoicono.png",
    data: {
      link: targetLink
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetPath = event.notification?.data?.link || "/";
  const targetUrl = new URL(targetPath, self.location.origin).toString();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      const matchingClient = windowClients.find((client) => {
        try {
          const clientUrl = new URL(client.url);
          const desiredUrl = new URL(targetUrl);
          return clientUrl.origin === desiredUrl.origin;
        } catch {
          return false;
        }
      });

      if (matchingClient) {
        matchingClient.navigate(targetUrl);
        return matchingClient.focus();
      }

      return clients.openWindow(targetUrl);
    })
  );
});
