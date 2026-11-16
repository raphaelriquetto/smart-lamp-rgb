// Cores fixas (grade) e últimas cores usadas (linha).
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PRESETS } from '../colors';
import { isLight, theme, withAlpha } from '../theme';

const same = (a: string, b: string) => a.slice(0, 7).toUpperCase() === b.slice(0, 7).toUpperCase();

type Props = { current: string; on: boolean; onPick: (hex: string, name?: string) => void };

export function PresetGrid({ current, on, onPick }: Props) {
  return (
    <View style={styles.grid}>
      {PRESETS.map((p) => {
        const selected = on && same(p.hex, current);
        return (
          <Pressable
            key={p.hex}
            onPress={() => onPick(p.hex, p.name)}
            accessibilityLabel={p.name}
            style={({ pressed }) => [styles.item, pressed && { transform: [{ scale: 0.92 }] }]}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: p.hex, shadowColor: p.hex },
                selected && { borderColor: theme.text, shadowOpacity: 0.7 },
              ]}
            >
              {selected && <Ionicons name="checkmark" size={22} color={isLight(p.hex) ? '#15161C' : '#fff'} />}
            </View>
            <Text style={[styles.label, selected && { color: theme.text }]}>{p.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RecentRow({ colors, onPick }: { colors: string[]; onPick: (hex: string) => void }) {
  if (!colors.length) return <Text style={styles.empty}>As cores que você usar aparecem aqui.</Text>;
  return (
    <View style={styles.row}>
      {colors.map((hex) => (
        <Pressable
          key={hex}
          onPress={() => onPick(hex)}
          accessibilityLabel={`Cor recente ${hex}`}
          style={({ pressed }) => [
            styles.recent,
            { backgroundColor: hex, borderColor: withAlpha(hex, 0.35) },
            pressed && { transform: [{ scale: 0.9 }] },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  item: { width: '25%', alignItems: 'center' },
  swatch: {
    width: 54,
    height: 54,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { color: theme.muted, fontSize: 11.5, marginTop: 6 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  recent: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  empty: { color: theme.faint, fontSize: 13 },
});
