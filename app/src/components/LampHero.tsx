// Lâmpada central: anéis de brilho na cor atual e botão de liga/desliga no meio.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colorName, isLight, theme, withAlpha } from '../theme';

const SIZE = 250;
const RINGS = [
  { scale: 1, alpha: 0.07 },
  { scale: 0.8, alpha: 0.13 },
  { scale: 0.62, alpha: 0.22 },
];

type Props = { color: string; on: boolean; onToggle: () => void };

export function LampHero({ color, on, onToggle }: Props) {
  const glow = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    glow.value = withTiming(on ? 1 : 0, { duration: 350 });
  }, [on]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.75 }));

  const core = on ? color : theme.off;
  const iconColor = on && isLight(color) ? '#15161C' : '#FFFFFF';

  return (
    <View style={styles.wrap}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.center, glowStyle]} pointerEvents="none">
        {RINGS.map((r) => (
          <View
            key={r.scale}
            style={[
              styles.ring,
              {
                width: SIZE * r.scale,
                height: SIZE * r.scale,
                borderRadius: (SIZE * r.scale) / 2,
                backgroundColor: withAlpha(on ? color : theme.off, r.alpha),
              },
            ]}
          />
        ))}
      </Animated.View>

      <Pressable
        onPress={onToggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={on ? 'Desligar lâmpada' : 'Ligar lâmpada'}
        style={({ pressed }) => [
          styles.core,
          { backgroundColor: core, shadowColor: on ? color : '#000', transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <Ionicons name="power" size={42} color={iconColor} />
      </Pressable>

      <View style={styles.caption}>
        <Text style={styles.name}>{on ? colorName(color) : 'Desligada'}</Text>
        <Text style={styles.hex}>{on ? color.slice(0, 7).toUpperCase() : 'Toque para ligar'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE + 56, alignItems: 'center', alignSelf: 'center' },
  center: { height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  core: {
    marginTop: (SIZE - 112) / 2,
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.8,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  caption: { position: 'absolute', top: SIZE - 4, alignItems: 'center' },
  name: { color: theme.text, fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  hex: { color: theme.muted, fontSize: 13, marginTop: 2, letterSpacing: 1 },
});
