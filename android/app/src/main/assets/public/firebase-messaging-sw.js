importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// These values will be replaced or should be hardcoded for the SW
// Since I can't easily inject them at runtime into a static file in this env,
// I'll use a trick or just hardcode them from the config I saw.
firebase.initializeApp({
  projectId: "gen-lang-client-0577509245",
  appId: "1:260219526549:web:cc5c01048da76558a0ea9c",
  apiKey: "AIzaSyBPp-xIZDEBo7sxskCE7g4C81nSKVUZH6k",
  authDomain: "gen-lang-client-0577509245.firebaseapp.com",
  messagingSenderId: "260219526549"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Adjust if you have a logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
