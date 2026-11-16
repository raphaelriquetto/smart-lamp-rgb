// Superfície de vidro fosco: desfoque do fundo + camada translúcida + borda clara.
// No Android sem desfoque nativo, a camada translúcida sozinha já mantém o contraste.
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { color, radius } from '../theme';

type Props = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean; // mais opaco: folhas e modais, onde o texto precisa se isolar do fundo
  intensity?: number;
};

export function Glass({ children, style, strong, intensity = 28 }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: strong ? color.glassStrong : color.glass }]}
      />
      <View pointerEvents="none" style={styles.highlight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.glassBorder,
  },
  // Reflexo de luz na borda de cima
  highlight: { position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: color.glassHighlight },
});
