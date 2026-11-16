import { ComponentProps, ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Glass } from './Glass';
import { color, icon as iconSize, motion, space, type } from '../theme';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  right?: ReactNode;
  children: ReactNode;
  index?: number; // posição na tela, para a entrada em sequência
  style?: StyleProp<ViewStyle>;
};

export function Card({ icon, title, right, children, index = 0, style }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInDown.duration(motion.enter).delay(index * motion.stagger)}
      style={[styles.outer, style]}
    >
      <Glass style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons
              name={icon}
              size={iconSize.sm}
              color={color.mutedForeground}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={type.heading} accessibilityRole="header">
              {title}
            </Text>
          </View>
          {right}
        </View>
        {children}
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginTop: space.lg },
  card: { padding: space.xl - space.xs },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.lg,
    minHeight: 24,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
