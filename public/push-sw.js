/* DGP Finds: background-only push service worker (no caching or offline behavior). */
self.addEventListener('push', (event) => {
  let message = {};
  try {
    message = event.data ? event.data.json() : {};
  } catch {
    message = { body: event.data?.text() || '' };
  }

  const title = String(message.title || 'DGP Finds');
  const body = String(message.body || 'You have an important update from DGP Finds.');
  let path = '/profile';
  try {
    const url = new URL(message.url || '/profile', self.location.origin);
    if (url.origin === self.location.origin) path = url.pathname + url.search;
  } catch {
    // Default to profile for invalid URLs.
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/dgp-logo-icon.png',
      badge: '/dgp-logo-icon.png',
      tag: message.tag || undefined,
      renotify: false,
      data: { path },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path = event.notification.data?.path || '/profile';
  const targetUrl = new URL(path, self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const windowClient of windows) {
      if (new URL(windowClient.url).origin === self.location.origin) {
        await windowClient.focus();
        if ('navigate' in windowClient) await windowClient.navigate(targetUrl);
        return;
      }
    }
    await self.clients.openWindow(targetUrl);
  })());
});
