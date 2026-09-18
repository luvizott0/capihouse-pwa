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

  const data = event.notification.data || {}
  let targetUrl = data.url || '/'
  const notifId = data.notification_id || data.id

  // Append notif_id to URL query if not already present
  if (notifId && !targetUrl.includes('notif_id=')) {
    const separator = targetUrl.includes('?') ? '&' : '?'
    targetUrl = `${targetUrl}${separator}notif_id=${notifId}`
  }

  // Ensure absolute URL for WebKit / Safari iOS standalone PWA compatibility
  const fullTargetUrl = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's an existing open tab or standalone PWA window, focus and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()

          // Send message to client for instant Vue Router navigation & marking as read
          if ('postMessage' in client) {
            client.postMessage({
              type: 'PUSH_NOTIFICATION_CLICK',
              url: targetUrl,
              notificationId: notifId,
            })
          }

          if ('navigate' in client && targetUrl !== '/') {
            client.navigate(fullTargetUrl)
          }
          return
        }
      }

      // Otherwise, open a new window with full URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl)
      }
    })
  )
})

