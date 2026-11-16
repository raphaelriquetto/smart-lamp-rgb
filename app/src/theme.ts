// Tokens de design do Smart Lamp.
// Base gerada com a skill UI/UX Pro Max ("smart home iot lighting control mobile app dark"):
// estilo Glassmorphism, paleta slate escura com verde de status, fonte Plus Jakarta Sans.
import { TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRESETS } from './colors';

export const color = {
  background: '#0F172A',
  backgroundDeep: '#0A0F1E',
  card: '#1B2336',
  glass: 'rgba(30, 41, 59, 0.55)',
  glassStrong: 'rgba(27, 35, 54, 0.92)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassHighlight: 'rgba(255, 255, 255, 0.06)',
  muted: '#272F42',
  border: '#475569',
  foreground: '#F8FAFC',
  mutedForeground: '#94A3B8', // 6,9:1 sobre o fundo: passa no 4,5:1 para texto normal
  subtle: '#64748B', // só para texto grande ou elementos sem informação
  accent: '#22C55E',
  onAccent: '#0F172A',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  off: '#334155',
  scrim: 'rgba(2, 6, 23, 0.72)',
};

// Ritmo de 4/8 pontos
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

// Tamanhos de ícone fixos por nível (sm em rótulos, md em controles, lg em destaques)
export const icon = { sm: 16, md: 22, lg: 28, xl: 40 };

// Alvo de toque mínimo (44 pt iOS / 48 dp Android)
export const touch = 48;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const type = {
  display: { fontFamily: font.extrabold, fontSize: 30, lineHeight: 36, color: color.foreground, letterSpacing: -0.5 },
  title: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: color.foreground, letterSpacing: -0.2 },
  heading: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: color.foreground },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.foreground },
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: color.mutedForeground },
  caption: { fontFamily: font.medium, fontSize: 12, lineHeight: 16, color: color.mutedForeground },
  overline: {
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: color.mutedForeground,
  },
  mono: { fontFamily: font.semibold, fontSize: 13, letterSpacing: 1.5, color: color.mutedForeground },
} satisfies Record<string, TextStyle>;

// Durações por tipo de movimento (não uma só para tudo)
export const motion = {
  press: 120, // resposta ao toque: 80-150 ms
  state: 260, // troca de estado (liga/desliga, aba)
  enter: 380, // entrada dos cartões
  stagger: 60, // atraso entre cartões
};

const clean = (hex: string) => hex.replace('#', '').slice(0, 6).toUpperCase();

/** "#FF0000" + 0.2 -> "#FF000033" */
export function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${clean(hex)}${a}`;
}

/** Luminância relativa (WCAG 2.x). */
function luminance(hex: string) {
  const h = clean(hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Cor clara demais para ícone/texto branco por cima. Acima de 0,3 o branco cai abaixo
 * de 3:1 (mínimo para ícones na WCAG), então usamos o tom escuro.
 */
export function isLight(hex: string) {
  return luminance(hex) > 0.3;
}

/** Cor do conteúdo (ícone/texto) sobre um fundo colorido. */
export const onColor = (hex: string) => (isLight(hex) ? color.background : color.foreground);

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
