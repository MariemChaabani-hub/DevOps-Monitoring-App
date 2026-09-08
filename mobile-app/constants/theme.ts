/**
 * Design tokens for the CLEDISS mobile app — a single fixed dark theme
 * derived from the CLEDISS logo (navy background, purple/magenta/orange
 * gradient mark). Status colors mirror the web app's
 * frontend/src/pages/Dashboard.js getStatusColor exactly, so mobile and
 * web agree visually.
 */

import { Platform } from 'react-native';

export const Theme = {
  colors: {
    background: '#14142B',
    surface: '#1E1E3A',
    surfaceElevated: '#2A2A4E',
    border: '#33335A',
    textPrimary: '#FFFFFF',
    textSecondary: '#B4B4CC',
    textMuted: '#7C7C9C',
    accent: '#A855F7',
    accentAlt: '#F97316',
    danger: '#F44336',
  },
  status: {
    OK: '#4CAF50',
    WARNING: '#FFC107',
    CRITICAL: '#F44336',
    OFFLINE: '#9E9E9E',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
};

export const getStatusColor = (status: string): string =>
  (Theme.status as Record<string, string>)[status] || Theme.colors.textMuted;

const STATUS_LABELS_FR: Record<string, string> = {
  OK: 'OK',
  WARNING: 'Alerte',
  CRITICAL: 'Critique',
  OFFLINE: 'Hors ligne',
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS_FR[status] || 'Inconnu';

/**
 * Colors/labels for a systemd service's SubState — a different axis from
 * server status above (OK/WARNING/CRITICAL/OFFLINE). A unit can be
 * ActiveState=active while SubState=exited (a one-shot unit that already
 * finished, not actually running) — SubState is what tells that apart from
 * a real running daemon, so it's what the badge is keyed on, not ActiveState.
 */
const SUB_STATE_COLORS: Record<string, string> = {
  running: '#4CAF50',
  exited: '#2196F3',
  dead: '#F44336',
  failed: '#F44336',
};

const SUB_STATE_LABELS_FR: Record<string, string> = {
  running: 'En cours',
  exited: 'Terminé',
  dead: 'Arrêté',
  failed: 'Échec',
};

export const getSubStateColor = (subState?: string): string =>
  (subState && SUB_STATE_COLORS[subState]) || Theme.colors.textMuted;

export const getSubStateLabel = (subState?: string): string =>
  (subState && SUB_STATE_LABELS_FR[subState]) || 'Inconnu';

/**
 * Kept only so the unused Expo-template scaffolding (parallax-scroll-view,
 * collapsible, themed-text/view) still type-checks against Colors.light /
 * Colors.dark — the app itself has a single fixed dark theme and doesn't
 * branch on color scheme.
 */
export const Colors = {
  light: {
    text: Theme.colors.textPrimary,
    background: Theme.colors.background,
    tint: Theme.colors.accent,
    icon: Theme.colors.textSecondary,
    tabIconDefault: Theme.colors.textMuted,
    tabIconSelected: Theme.colors.accent,
  },
  dark: {
    text: Theme.colors.textPrimary,
    background: Theme.colors.background,
    tint: Theme.colors.accent,
    icon: Theme.colors.textSecondary,
    tabIconDefault: Theme.colors.textMuted,
    tabIconSelected: Theme.colors.accent,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
