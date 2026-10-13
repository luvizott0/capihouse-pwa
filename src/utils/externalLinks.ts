/**
 * Abre URLs externas de forma a permitir que o sistema operacional móvel
 * abra no aplicativo nativo/PWA instalado (ex: CapyShowTime como WebAPK no Android)
 * ou no navegador padrão do sistema, em vez de prender a navegação dentro do
 * webview interno do CapiHouse PWA.
 */
export function openExternalUrl(url: string): void {
  if (typeof window === 'undefined') return

  const isAndroid = /Android/i.test(navigator.userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true

  // No Android instalado como PWA: dispara Intent para o SO resolver o app ou navegador padrão
  if (isAndroid && isStandalone) {
    try {
      const parsed = new URL(url)
      const scheme = parsed.protocol.replace(':', '') || 'https'
      const hostAndPath = parsed.host + parsed.pathname + parsed.search
      const intentUrl = `intent://${hostAndPath}#Intent;scheme=${scheme};action=android.intent.action.VIEW;end;`

      window.location.href = intentUrl
      return
    } catch (e) {
      console.warn('Erro ao disparar Intent Android:', e)
    }
  }

  // Fallback seguro para desktop e iOS
  window.open(url, '_blank', 'noopener,noreferrer')
}
