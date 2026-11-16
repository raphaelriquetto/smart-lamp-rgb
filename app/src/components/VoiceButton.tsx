// Botão "segure e fale" com ondas pulsando enquanto escuta.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../theme';

type Props = {
  available: boolean;
  listening: boolean;
  accent: string;
  onStart: () => void;
  onStop: () => void;
};

export function VoiceButton({ available, listening, accent, onStart, onStop }: Props) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (listening) {
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, false);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 200 });
    }
  }, [listening]);

  const wave = useAnimatedStyle(() => ({
    opacity: listening ? 0.6 * (1 - pulse.value) : 0,
    transform: [{ scale: 1 + pulse.value * 0.7 }],
  }));

  const color = listening ? theme.danger : accent;

  return (
    <View style={styles.row}>
      <View style={styles.micWrap}>
        <Animated.View style={[styles.wave, { backgroundColor: color }, wave]} pointerEvents="none" />
        <Pressable
          onPressIn={onStart}
          onPressOut={onStop}
          disabled={!available}
          accessibilityLabel="Segure para falar uma cor"
          style={({ pressed }) => [
            styles.mic,
            { backgroundColor: available ? color : theme.off, shadowColor: color },
            pressed && { transform: [{ scale: 0.93 }] },
          ]}
        >
          <Ionicons name={listening ? 'mic' : 'mic-outline'} size={30} color="#fff" />
        </Pressable>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {!available ? 'Voz indisponível no Expo Go' : listening ? 'Ouvindo… solte para enviar' : 'Segure e fale'}
        </Text>
        <Text style={styles.hint}>
          {available ? '“azul”, “deixa vermelho”, “desliga”' : 'Precisa da development build (veja o README)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  micWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', width: 72, height: 72, borderRadius: 36 },
  mic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  title: { color: theme.text, fontSize: 15, fontWeight: '600' },
  hint: { color: theme.muted, fontSize: 12.5, marginTop: 3 },
});
