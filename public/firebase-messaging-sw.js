importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBFDDpDgUrCWxUPeUw28j0F1T9mLmjtDVk",
  authDomain: "csquared-vacation.firebaseapp.com",
  projectId: "csquared-vacation",
  storageBucket: "csquared-vacation.firebasestorage.app",
  messagingSenderId: "16834141553",
  appId: "1:16834141553:web:17e779ed6e725b6990aad0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || '씨스퀘어자산운용 휴가관리', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'vacation-notification',
    renotify: true
  });
});
