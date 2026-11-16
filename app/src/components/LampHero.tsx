// Lâmpada central: luz que se espalha em degradê suave e "respira" quando ligada; tocar liga/desliga.
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
import { Light, falloff } from './Light';
import { color, colorName, icon, isLight, mix, motion, space, type } from '../theme';

const STAGE = 300; // área da luz
const BLOOM = 240; // brilho concentrado perto do botão
const CORE = 112; // o "vidro" da lâmpada

type Props = { color: string; on: boolean; onToggle: () => void };

export function LampHero({ color: lampColor, on, onToggle }: Props) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(on ? 1 : 0);
  const breath = useSharedValue(0);

  useEffect(() => {
    glow.value = withTiming(on ? 1 : 0, { duration: motion.state });
    if (on && !reduceMotion) {
      breath.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      cancelAnimation(breath);
      breath.value = withTiming(0, { duration: motion.state });
    }
  }, [on, reduceMotion]);

  // A luz acende/apaga com fade e pulsa de leve (intensidade + tamanho)
  const halo = useAnimatedStyle(() => ({
    opacity: glow.value * (0.85 + breath.value * 0.15),
    transform: [{ scale: 0.94 + glow.value * 0.06 + breath.value * 0.03 }],
  }));

  const hex = lampColor.slice(0, 7);
  const iconColor = on && isLight(hex) ? color.background : color.foreground;

  // Vidro: ponto quente quase branco no alto à esquerda, a cor no meio e borda um pouco mais escura
  const glass = on
    ? [
        { at: 0, color: mix(hex, '#FFFFFF', 0.78), opacity: 1 },
        { at: 0.35, color: mix(hex, '#FFFFFF', 0.28), opacity: 1 },
        { at: 0.75, color: hex, opacity: 1 },
        { at: 1, color: mix(hex, '#000000', 0.18), opacity: 1 },
      ]
    : [
        { at: 0, color: '#475569', opacity: 1 },
        { at: 0.6, color: '#334155', opacity: 1 },
        { at: 1, color: '#1E293B', opacity: 1 },
      ];

  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>
        <Animated.View style={[styles.layer, halo]} pointerEvents="none">
          <Light width={STAGE} stops={falloff(hex, 0.75)} style={styles.abs} />
          <Light width={BLOOM} stops={falloff(mix(hex, '#FFFFFF', 0.35), 0.95)} style={styles.abs} />
        </Animated.View>

        <Pressable
          onPress={onToggle}
          accessibilityRole="switch"
          accessibilityState={{ checked: on }}
          accessibilityLabel={on ? 'Desligar lâmpada' : 'Ligar lâmpada'}
          style={({ pressed }) => [styles.core, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
        >
          <Light width={CORE} stops={glass} cx={0.4} cy={0.36} style={styles.abs} />
          <Ionicons name="power" size={icon.xl} color={iconColor} />
        </Pressable>
      </View>

      <Text style={[type.title, styles.name]}>{on ? colorName(hex) : 'Desligada'}</Text>
      <Text style={[type.mono, styles.hint]}>{on ? hex.toUpperCase() : 'TOQUE PARA LIGAR'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  stage: { width: STAGE, height: STAGE, alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
  core: {
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  name: { marginTop: -space.xl },
  hint: { marginTop: space.xs },
});
