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
  if (echoInstance) return echoInstance

  const token = localStorage.getItem('capihouse_token')

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
