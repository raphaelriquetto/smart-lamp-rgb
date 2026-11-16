// Lâmpada central: halo na cor atual que "respira" quando ligada; tocar liga/desliga.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { color, colorName, icon, isLight, motion, space, type, withAlpha } from '../theme';

const SIZE = 264;
const CORE = 120;
const RINGS = [
  { scale: 1, alpha: 0.06 },
  { scale: 0.82, alpha: 0.11 },
  { scale: 0.66, alpha: 0.2 },
];

type Props = { color: string; on: boolean; onToggle: () => void };

export function LampHero({ color: lampColor, on, onToggle }: Props) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(on ? 1 : 0);
  const breath = useSharedValue(0);

  useEffect(() => {
    glow.value = withTiming(on ? 1 : 0, { duration: motion.state });
    if (on && !reduceMotion) {
      breath.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: motion.state });
    }
  }, [on, reduceMotion]);

  const halo = useAnimatedStyle(() => ({
    opacity: 0.3 + glow.value * 0.7,
    transform: [{ scale: 1 + breath.value * 0.04 }],
  }));

  const tint = on ? lampColor : color.off;
  const iconColor = on && isLight(lampColor) ? color.background : color.foreground;

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, halo]} pointerEvents="none">
          {RINGS.map((r) => (
            <View
              key={r.scale}
              style={[
                styles.ring,
                {
                  width: SIZE * r.scale,
                  height: SIZE * r.scale,
                  borderRadius: (SIZE * r.scale) / 2,
                  backgroundColor: withAlpha(tint, on ? r.alpha : r.alpha * 0.5),
                  borderColor: withAlpha(tint, on ? 0.18 : 0.08),
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
            {
              backgroundColor: tint,
              shadowColor: on ? lampColor : '#000',
              borderColor: on ? withAlpha('#FFFFFF', 0.35) : color.glassBorder,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons name="power" size={icon.xl} color={iconColor} />
        </Pressable>
      </View>

      <Text style={[type.title, styles.name]}>{on ? colorName(lampColor) : 'Desligada'}</Text>
      <Text style={[type.mono, styles.hint]}>{on ? lampColor.slice(0, 7).toUpperCase() : 'TOQUE PARA LIGAR'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  stage: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 1 },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    shadowOpacity: 0.85,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  name: { marginTop: space.sm },
  hint: { marginTop: space.xs },
});
