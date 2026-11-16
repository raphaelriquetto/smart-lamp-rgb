// Botão "segure e fale" com ondas pulsando enquanto escuta.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { color, icon, motion, onColor, space, type } from '../theme';

type Props = {
  available: boolean;
  listening: boolean;
  accent: string;
  onStart: () => void;
  onStop: () => void;
};

const MIC = 72;

export function VoiceButton({ available, listening, accent, onStart, onStop }: Props) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (listening && !reduceMotion) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: motion.press });
    }
  }, [listening, reduceMotion]);

  const wave = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));

  const tone = listening ? color.danger : accent;

  return (
    <View style={styles.row}>
      <View style={styles.micWrap}>
        <Animated.View style={[styles.wave, { backgroundColor: tone }, wave]} pointerEvents="none" />
        <Pressable
          onPressIn={onStart}
          onPressOut={onStop}
          disabled={!available}
          accessibilityRole="button"
          accessibilityLabel="Segure para falar uma cor"
          accessibilityState={{ disabled: !available, busy: listening }}
          style={({ pressed }) => [
            styles.mic,
            {
              backgroundColor: available ? tone : color.off,
              shadowColor: tone,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
        >
          <Ionicons
            name={listening ? 'mic' : 'mic-outline'}
            size={icon.lg}
            color={available ? onColor(tone) : color.foreground}
          />
        </Pressable>
      </View>
      <View style={styles.text}>
        <Text style={type.heading}>
          {!available ? 'Voz indisponível no Expo Go' : listening ? 'Ouvindo… solte para enviar' : 'Segure e fale'}
        </Text>
        <Text style={type.label}>
          {available ? '“azul”, “deixa vermelho”, “desliga”' : 'Precisa da development build (veja o README)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg + 2 },
  micWrap: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2 },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  text: { flex: 1, gap: 2 },
});
