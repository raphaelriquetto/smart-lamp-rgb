import * as Haptics from 'expo-haptics';
import { PRESETS } from './colors';

export const theme = {
  bg: '#0B0C10',
  card: '#15161C',
  cardHigh: '#1C1D25',
  border: '#24252F',
  text: '#F3F3F6',
  muted: '#8A8C99',
  faint: '#5A5C68',
  success: '#3DDC97',
  danger: '#FF5C7A',
  warning: '#FFB547',
  off: '#3A3B46',
  radius: 22,
};

const clean = (hex: string) => hex.replace('#', '').slice(0, 6).toUpperCase();

/** "#FF0000" + 0.2 -> "#FF000033" */
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean(hex)}${a}`;
}

/** Cor clara (amarelo, branco, ciano) pede ícone escuro por cima. */
export function isLight(hex: string) {
  const h = clean(hex);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

export function colorName(hex: string) {
  return PRESETS.find((p) => clean(p.hex) === clean(hex))?.name ?? 'Personalizada';
}

// Vibração leve ao tocar. No navegador não existe: ignora o erro.
export const haptic = {
  tap: () => Haptics.selectionAsync().catch(() => {}),
  press: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  ok: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
