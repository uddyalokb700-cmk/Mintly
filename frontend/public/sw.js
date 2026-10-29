/* Mintly Web Push Service Worker */

self.addEventListener('push', function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'Mintly Budget Alert';
    const options = {
      body: data.body || 'You have a new update from Mintly.',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: {
        url: data.url || '/'
      },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Mintly Notification', {
        body: text,
        icon: '/favicon.svg',
      })
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
