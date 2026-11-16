import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { theme, withAlpha } from '../theme';

export type Connection = 'unknown' | 'online' | 'offline' | 'sending';

const LABEL: Record<Connection, string> = {
  unknown: 'Sem servidor',
  online: 'Conectada',
  offline: 'Sem conexão',
  sending: 'Enviando',
};

const COLOR: Record<Connection, string> = {
  unknown: theme.muted,
  online: theme.success,
  offline: theme.danger,
  sending: theme.warning,
};

export function StatusPill({ state }: { state: Connection }) {
  const c = COLOR[state];
  return (
    <View style={[styles.pill, { backgroundColor: withAlpha(c, 0.12), borderColor: withAlpha(c, 0.35) }]}>
      {state === 'sending' ? (
        <ActivityIndicator size={10} color={c} />
      ) : (
        <View style={[styles.dot, { backgroundColor: c }]} />
      )}
      <Text style={[styles.text, { color: c }]}>{LABEL[state]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '600' },
});
