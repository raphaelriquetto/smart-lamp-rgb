// Seletor de abas com indicador deslizante (ex.: Roda | Paleta).
import { ComponentProps, useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { color, font, icon, motion, radius, space } from '../theme';

type Option<T extends string> = { value: T; label: string; icon: ComponentProps<typeof Ionicons>['name'] };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

const PAD = space.xs;

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segment = width > 0 ? (width - PAD * 2) / options.length : 0;

  const x = useSharedValue(0);
  useEffect(() => {
    x.value = reduceMotion ? index * segment : withTiming(index * segment, { duration: motion.state });
  }, [index, segment, reduceMotion]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segment > 0 && <Animated.View style={[styles.indicator, { width: segment }, indicator]} />}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            style={({ pressed }) => [styles.option, pressed && !active && { opacity: 0.7 }]}
          >
            <Ionicons
              name={o.icon}
              size={icon.sm}
              color={active ? color.foreground : color.mutedForeground}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 1,
    borderColor: color.glassBorder,
    marginBottom: space.xl,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(248, 250, 252, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.12)',
  },
  option: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm - 2,
  },
  label: { fontFamily: font.semibold, fontSize: 14, color: color.mutedForeground },
  labelActive: { color: color.foreground },
});
