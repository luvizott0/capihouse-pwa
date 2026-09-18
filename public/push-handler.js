// Push Event Listener
self.addEventListener('push', (event) => {
  if (!event.data) {
    return
  }

  try {
    const payload = event.data.json()
    const title = payload.title || 'CapiHouse'
    const options = {
      body: payload.body || '',
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/favicon-96x96.png',
      data: payload.data || {},
      vibrate: [100, 50, 100],
      tag: payload.data?.type || 'capihouse-notification',
      renotify: true,
    }

    event.waitUntil(self.registration.showNotification(title, options))
  } catch (err) {
    // Fallback if data is plain text
    const text = event.data.text()
    event.waitUntil(
      self.registration.showNotification('CapiHouse', {
        body: text,
        icon: '/pwa-192x192.png',
        badge: '/favicon-96x96.png',
      })
    )
  }
})

// Notification Click Listener (Deep Linking & Window Focusing)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's an existing open tab, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(targetUrl)
          }
          return
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
