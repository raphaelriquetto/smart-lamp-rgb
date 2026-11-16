// Indicadores logo abaixo da lâmpada: estado, cor atual e conexão (com horário da última sincronização).
// A skill pede para rotular dados "ao vivo" com o horário da atualização e mostrar quando estão desatualizados.
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Glass } from './Glass';
import { color, colorName, font, motion, radius, space, type } from '../theme';

export type Connection = 'unknown' | 'online' | 'offline' | 'sending';

type Props = { on: boolean; hex: string; lastSync: Date | null; connection: Connection };

function relative(date: Date | null, now: number) {
  if (!date) return '—';
  const s = Math.round((now - date.getTime()) / 1000);
  if (s < 10) return 'agora';
  if (s < 60) return `há ${s}s`;
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const CONNECTION_TONE: Record<Connection, string> = {
  unknown: color.subtle,
  online: color.success,
  offline: color.danger,
  sending: color.warning,
};

export function StatTiles({ on, hex, lastSync, connection }: Props) {
  const reduceMotion = useReducedMotion();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  const name = colorName(hex);
  const connectionValue =
    connection === 'offline'
      ? 'Offline'
      : connection === 'sending'
        ? 'Enviando'
        : connection === 'unknown'
          ? 'Sem IP'
          : relative(lastSync, now);

  const tiles = [
    { label: 'Estado', value: on ? 'Ligada' : 'Desligada', dot: on ? color.success : color.subtle },
    // Cor fora da paleta mostra o código: o nome "Personalizada" não cabe e não informa nada
    { label: 'Cor', value: name === 'Personalizada' ? hex.slice(0, 7).toUpperCase() : name, dot: hex },
    { label: 'Conexão', value: connectionValue, dot: CONNECTION_TONE[connection], busy: connection === 'sending' },
  ];

  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(motion.enter)} style={styles.row}>
      {tiles.map((t) => (
        <Glass key={t.label} style={styles.tile} intensity={20}>
          <Text style={type.overline} numberOfLines={1}>
            {t.label}
          </Text>
          <View
            style={styles.valueRow}
            accessible
            accessibilityLabel={`${t.label}: ${t.value}`}
            accessibilityLiveRegion={t.label === 'Conexão' ? 'polite' : 'none'}
          >
            {t.busy ? (
              <ActivityIndicator size={8} color={t.dot} />
            ) : (
              <View style={[styles.dot, { backgroundColor: t.dot, shadowColor: t.dot }]} />
            )}
            <Text style={styles.value} numberOfLines={1}>
              {t.value}
            </Text>
          </View>
        </Glass>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, paddingVertical: space.md, paddingHorizontal: space.md, borderRadius: radius.md, gap: space.xs + 2 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  value: { fontFamily: font.semibold, fontSize: 13, color: color.foreground, flexShrink: 1 },
});
