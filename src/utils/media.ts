export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const apiUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api'
  const backendBase = apiUrl.replace(/\/api\/?$/, '')
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${backendBase}${cleanPath}`
}
