// Cores fixas (grade) e últimas cores usadas (linha). Alvos de toque de pelo menos 48 pt.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { PRESETS } from '../colors';
import { color, icon, isLight, radius, space, type, withAlpha } from '../theme';

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
            accessibilityRole="button"
            accessibilityLabel={p.name}
            accessibilityState={{ selected }}
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
          >
            {/* O anel de seleção existe sempre (transparente quando não selecionado): nada se desloca */}
            <View style={[styles.ring, { borderColor: selected ? color.foreground : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: p.hex, shadowColor: p.hex }]}>
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={icon.md}
                    color={isLight(p.hex) ? color.background : color.foreground}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </View>
            </View>
            <Text style={[type.caption, selected && { color: color.foreground }]}>{p.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RecentRow({ colors, onPick }: { colors: string[]; onPick: (hex: string) => void }) {
  if (!colors.length) {
    return <Text style={type.label}>As cores que você usar aparecem aqui.</Text>;
  }
  return (
    <View style={styles.recentRow}>
      {colors.map((hex) => (
        <Pressable
          key={hex}
          onPress={() => onPick(hex)}
          accessibilityRole="button"
          accessibilityLabel={`Cor recente ${hex}`}
          hitSlop={4}
          style={({ pressed }) => [styles.recentHit, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.recent, { backgroundColor: hex, borderColor: withAlpha('#FFFFFF', 0.18) }]} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  item: { width: '25%', alignItems: 'center', gap: space.sm - 2 },
  ring: { padding: 3, borderRadius: radius.lg, borderWidth: 2 },
  swatch: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  recentHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  recent: { width: 36, height: 36, borderRadius: 18, borderWidth: 2 },
});
