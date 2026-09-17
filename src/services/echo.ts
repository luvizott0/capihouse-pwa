import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Make Pusher available globally (required by Laravel Echo)
;(window as any).Pusher = Pusher

let echoInstance: Echo<'reverb'> | null = null

/**
 * Initialize and return the Laravel Echo instance.
 * Must be called after the user is authenticated and the token is in localStorage.
 */
export function connectEcho(): Echo<'reverb'> {
  const token = localStorage.getItem('capihouse_token')

  if (echoInstance) {
    if (token && (echoInstance as any).options?.auth?.headers) {
      (echoInstance as any).options.auth.headers.Authorization = `Bearer ${token}`
    }
    return echoInstance
  }

  echoInstance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY ?? 'capihouse-key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT
      ? Number(import.meta.env.VITE_REVERB_PORT)
      : (window.location.port ? Number(window.location.port) : 80),
    wssPort: import.meta.env.VITE_REVERB_PORT
      ? Number(import.meta.env.VITE_REVERB_PORT)
      : (window.location.port ? Number(window.location.port) : 443),
    scheme: import.meta.env.VITE_REVERB_SCHEME ?? (window.location.protocol === 'https:' ? 'https' : 'http'),
    forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? window.location.protocol.replace(':', '')) === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: `${import.meta.env.VITE_API_URL ?? '/api'}/broadcasting/auth`,
    auth: {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    },
  })

  if (import.meta.env.DEV) {
    const pusherClient = (echoInstance as any).connector?.pusher
    if (pusherClient?.connection) {
      pusherClient.connection.bind('state_change', (states: { previous: string; current: string }) => {
        console.log(`%c[WebSocket] ${states.previous} → ${states.current}`, 'color: #00c896; font-weight: bold')
      })
      pusherClient.connection.bind('error', (err: any) => {
        console.warn('[WebSocket] Connection status:', err)
      })
    }
  }

  return echoInstance
}

/**
 * Disconnect and destroy the Echo instance.
 * Should be called on logout.
 */
export function disconnectEcho(): void {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
}

/**
 * Get the current Echo instance (without initializing).
 */
export function getEcho(): Echo<'reverb'> | null {
  return echoInstance
}
