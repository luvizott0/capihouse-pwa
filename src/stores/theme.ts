import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UserTheme } from '@/types/models'

// ──────────────────────────────────────────
// Default (original) theme constants
// These match the values in src/assets/css/main.css exactly.
// They are used both as the initial state and as the restore target.
// ──────────────────────────────────────────
export const DEFAULT_THEME: Required<UserTheme> = {
  bg_type: 'color',
  bg_value: '#f8f6f1',
  bg_size: 'auto',
  bg_repeat: 'no-repeat',
  bg_position: 'center',
  color_primary: '#a66130',
}

const DEFAULT_SHADES: Record<string, string> = {
  '--color-primary-50':  '#f8f6f1',
  '--color-primary-100': '#fdf8f3',
  '--color-primary-200': '#e8c9a5',
  '--color-primary-300': '#d4a574',
  '--color-primary-400': '#c4884e',
  '--color-primary-500': '#b07a3b',
  '--color-primary-600': '#9a6a32',
  '--color-primary-700': '#7d5628',
  '--color-primary-800': '#5f4120',
  '--color-primary-900': '#422d16',
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/** Parse "#rrggbb" into { r, g, b } (0-255 integers) */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex)
  if (!m || !m[1] || !m[2] || !m[3]) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

/** Convert RGB to hex string */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('')
}

/** Mix a base colour toward white (factor 0=base, 1=white) */
function tint(hex: string, factor: number): string {
  const c = hexToRgb(hex)
  if (!c) return hex
  return rgbToHex(c.r + (255 - c.r) * factor, c.g + (255 - c.g) * factor, c.b + (255 - c.b) * factor)
}

/** Mix a base colour toward black (factor 0=base, 1=black) */
function shade(hex: string, factor: number): string {
  const c = hexToRgb(hex)
  if (!c) return hex
  return rgbToHex(c.r * (1 - factor), c.g * (1 - factor), c.b * (1 - factor))
}

/**
 * Generate a full palette of 10 shades from a single hex colour.
 * The scale follows a perceptual lightness curve so that -50 is nearly
 * white and -900 is very dark, matching the Tailwind-like naming.
 */
function generateShades(primary: string): Record<string, string> {
  return {
    '--color-primary-50':  tint(primary, 0.93),
    '--color-primary-100': tint(primary, 0.88),
    '--color-primary-200': tint(primary, 0.70),
    '--color-primary-300': tint(primary, 0.52),
    '--color-primary-400': tint(primary, 0.32),
    '--color-primary-500': tint(primary, 0.16),
    '--color-primary-600': shade(primary, 0.08),
    '--color-primary-700': shade(primary, 0.24),
    '--color-primary-800': shade(primary, 0.42),
    '--color-primary-900': shade(primary, 0.58),
  }
}

// ──────────────────────────────────────────
// Store
// ──────────────────────────────────────────
export const useThemeStore = defineStore('theme', () => {
  const activeTheme = ref<UserTheme | null>(null)

  /**
   * Apply a UserTheme object to the document root CSS variables.
   * Passing null or undefined resets to defaults.
   */
  function applyTheme(theme: UserTheme | null | undefined) {
    const root = document.documentElement
    const t = theme ?? DEFAULT_THEME

    // ── Primary colour + generated shades ──────────────────
    const primary = t.color_primary || DEFAULT_THEME.color_primary
    root.style.setProperty('--color-primary', primary)

    const shades = primary !== DEFAULT_THEME.color_primary
      ? generateShades(primary)
      : DEFAULT_SHADES

    for (const [prop, value] of Object.entries(shades)) {
      root.style.setProperty(prop, value)
    }

    // ── Background ─────────────────────────────────────────
    if (t.bg_type === 'image' && t.bg_value) {
      root.style.setProperty('--bg-paper', 'transparent')
      root.style.setProperty('--bg-app-image', `url("${t.bg_value}")`)
      root.style.setProperty('--bg-app-size',     t.bg_size     || 'cover')
      root.style.setProperty('--bg-app-repeat',   t.bg_repeat   || 'no-repeat')
      root.style.setProperty('--bg-app-position', t.bg_position || 'center')
    } else {
      // Solid colour background
      const bgColor = (t.bg_type === 'color' && t.bg_value) ? t.bg_value : DEFAULT_THEME.bg_value
      root.style.setProperty('--bg-paper', bgColor)
      root.style.setProperty('--bg-app-image',    'none')
      root.style.setProperty('--bg-app-size',     'auto')
      root.style.setProperty('--bg-app-repeat',   'no-repeat')
      root.style.setProperty('--bg-app-position', 'center')
    }

    activeTheme.value = t
  }

  /**
   * Restore the original default theme and remove all inline CSS overrides.
   */
  function resetTheme() {
    const root = document.documentElement

    // Remove all inline overrides so the :root defaults in main.css take over
    root.style.removeProperty('--color-primary')
    for (const prop of Object.keys(DEFAULT_SHADES)) {
      root.style.removeProperty(prop)
    }
    root.style.removeProperty('--bg-paper')
    root.style.removeProperty('--bg-app-image')
    root.style.removeProperty('--bg-app-size')
    root.style.removeProperty('--bg-app-repeat')
    root.style.removeProperty('--bg-app-position')

    activeTheme.value = null
  }

  /**
   * Load and apply a theme from a user object (on login, route change, etc.)
   */
  function loadThemeFromUser(user: { theme?: UserTheme | null } | null | undefined) {
    if (user?.theme) {
      applyTheme(user.theme)
    } else {
      resetTheme()
    }
  }

  return {
    activeTheme,
    applyTheme,
    resetTheme,
    loadThemeFromUser,
  }
})
