import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
// Um import por peso: assim só os 5 pesos usados entram no app (e não os 14 da família)
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import ColorPicker, { BrightnessSlider, ColorFormatsObject, Panel3 } from 'reanimated-color-picker';

import { color, colorName, haptic, icon, motion, radius, space, touch, type } from './src/theme';
import { Light, falloff } from './src/components/Light';
import { DEFAULT_CONFIG, LampConfig, getState, loadConfig, saveConfig, setColor, turnOff, turnOn } from './src/orion';
import { parseVoice } from './src/voice/parseVoice';
import { useVoiceCommand, voiceAvailable } from './src/voice/useVoiceCommand';
import { LampHero } from './src/components/LampHero';
import { Card } from './src/components/Card';
import { Glass } from './src/components/Glass';
import { Segmented } from './src/components/Segmented';
import { Connection, StatTiles } from './src/components/StatTiles';
import { PresetGrid, RecentRow } from './src/components/Swatches';
import { VoiceButton } from './src/components/VoiceButton';
import { SettingsSheet } from './src/components/SettingsSheet';

const RECENTS_KEY = 'smart-lamp-recents';
const MAX_RECENTS = 6;
// Luz ambiente centrada mais ou menos na altura da lâmpada
const AURA_HEIGHT = 680;
const AURA_TOP = -130;

type Message = { kind: 'info' | 'ok' | 'error'; text: string };
type ColorTab = 'wheel' | 'palette';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.background }}>
      <SafeAreaProvider>
        {/* Sem tela vazia enquanto a fonte carrega; se a fonte falhar, segue com a do sistema */}
        {fontsLoaded || fontError ? (
          <Home />
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={color.mutedForeground} />
          </View>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Home() {
  const reduceMotion = useReducedMotion();
  const [config, setConfig] = useState<LampConfig>(DEFAULT_CONFIG);
  const [lampColor, setLampColor] = useState('#FFFFFF');
  const [on, setOn] = useState(false);
  const [connection, setConnection] = useState<Connection>('unknown');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [message, setMessage] = useState<Message>({ kind: 'info', text: 'Toque na lâmpada ou escolha uma cor' });
  const [recents, setRecents] = useState<string[]>([]);
  const [tab, setTab] = useState<ColorTab>('wheel');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  // Destaque da interface acompanha a lâmpada; desligada, usa o verde de status da paleta.
  const accent = on ? lampColor.slice(0, 7) : color.accent;

  const refresh = useCallback(async (cfg: LampConfig) => {
    if (!cfg.host) return setConnection('unknown');
    try {
      const s = await getState(cfg);
      if (s.color && /^[0-9A-F]{6}$/i.test(s.color)) setLampColor(`#${s.color.toUpperCase()}`);
      setOn(s.state === 'on');
      setConnection('online');
      setLastSync(new Date());
    } catch (e: any) {
      setConnection('offline');
      setMessage({ kind: 'error', text: e.message ?? String(e) });
    }
  }, []);

  useEffect(() => {
    loadConfig().then((cfg) => {
      setConfig(cfg);
      if (!cfg.host) setSettingsOpen(true);
      else refresh(cfg);
    });
    AsyncStorage.getItem(RECENTS_KEY)
      .then((raw) => raw && setRecents(JSON.parse(raw)))
      .catch(() => {});
  }, [refresh]);

  const remember = useCallback((hex: string) => {
    const h = hex.slice(0, 7).toUpperCase();
    setRecents((prev) => {
      const next = [h, ...prev.filter((c) => c !== h)].slice(0, MAX_RECENTS);
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const send = useCallback(async (label: string, action: () => Promise<void>) => {
    setConnection('sending');
    try {
      await action();
      setConnection('online');
      setLastSync(new Date());
      setMessage({ kind: 'ok', text: label });
      haptic.ok();
    } catch (e: any) {
      setConnection('offline');
      setMessage({ kind: 'error', text: e.message ?? String(e) });
      haptic.error();
    }
  }, []);

  const applyColor = useCallback(
    (hex: string, name?: string) => {
      const h = hex.slice(0, 7).toUpperCase();
      setLampColor(h);
      setOn(true);
      remember(h);
      send(`Cor alterada para ${name ?? colorName(h)}`, () => setColor(config, h));
    },
    [config, remember, send],
  );

  const toggle = useCallback(() => {
    haptic.press();
    const next = !on;
    setOn(next);
    send(next ? 'Lâmpada ligada' : 'Lâmpada desligada', () => (next ? turnOn(config) : turnOff(config)));
  }, [on, config, send]);

  const voice = useVoiceCommand({
    onPhrase: (alternatives) => {
      for (const phrase of alternatives) {
        const action = parseVoice(phrase);
        if (!action) continue;
        if (action.type === 'off') {
          setOn(false);
          return send('Desligada por voz', () => turnOff(config));
        }
        if (action.type === 'on') {
          setOn(true);
          return send('Ligada por voz', () => turnOn(config));
        }
        return applyColor(action.color.hex, `${action.color.name} (voz)`);
      }
      setMessage({ kind: 'error', text: `Não entendi a cor em “${alternatives[0]}”` });
      haptic.error();
    },
    onError: (text) => setMessage({ kind: 'error', text }),
  });

  const messageIcon = message.kind === 'ok' ? 'checkmark-circle' : message.kind === 'error' ? 'alert-circle' : 'bulb-outline';
  const messageTone = message.kind === 'ok' ? color.success : message.kind === 'error' ? color.danger : color.mutedForeground;
  const glowTint = on ? lampColor : color.off;
  const showVoice = Platform.OS !== 'web';
  const auraWidth = Math.max(screenWidth * 1.7, 640);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Luz ambiente: a lâmpada ilumina o fundo atrás do vidro, em degradê suave.
          Fica numa camada própria e recortada: a elipse é mais larga que a tela e não pode empurrar o conteúdo. */}
      <View pointerEvents="none" style={styles.auraLayer}>
        <Light
          width={auraWidth}
          height={AURA_HEIGHT}
          stops={falloff(glowTint.slice(0, 7), on ? 0.3 : 0.1)}
          style={{ position: 'absolute', top: AURA_TOP, left: (screenWidth - auraWidth) / 2 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(motion.enter)} style={styles.header}>
            <View style={{ flexShrink: 1 }}>
              <Text style={type.overline}>FIWARE · Lamp {config.entityId.split(':').pop()}</Text>
              <Text style={type.display} numberOfLines={1} accessibilityRole="header">
                Smart Lamp
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Configurações do servidor"
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Glass style={styles.iconButton} intensity={20}>
                  <Ionicons name="settings-outline" size={icon.md} color={color.foreground} />
                </Glass>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.hero}>
            <LampHero color={lampColor} on={on} onToggle={toggle} />
          </View>

          <StatTiles on={on} hex={lampColor} lastSync={lastSync} connection={connection} />

          <View style={styles.message} accessibilityLiveRegion="polite">
            <Ionicons name={messageIcon} size={icon.sm} color={messageTone} />
            <Text style={[type.label, { color: messageTone, flexShrink: 1 }]} numberOfLines={2}>
              {message.text}
            </Text>
          </View>

          <Card icon="color-palette-outline" title="Cor da luz" index={1}>
            <Segmented<ColorTab>
              value={tab}
              onChange={(v) => {
                haptic.tap();
                setTab(v);
              }}
              options={[
                { value: 'wheel', label: 'Roda', icon: 'aperture-outline' },
                { value: 'palette', label: 'Paleta', icon: 'grid-outline' },
              ]}
            />

            {tab === 'wheel' ? (
              <ColorPicker
                value={lampColor}
                onCompleteJS={(c: ColorFormatsObject) => applyColor(c.hex)}
                style={styles.picker}
              >
                <Panel3 centerChannel="saturation" thumbSize={34} thumbShape="circle" />
                <View style={styles.sliderRow}>
                  <Ionicons name="sunny-outline" size={icon.sm} color={color.mutedForeground} />
                  <BrightnessSlider style={styles.slider} thumbSize={28} />
                  <Ionicons name="sunny" size={icon.md} color={color.mutedForeground} />
                </View>
              </ColorPicker>
            ) : (
              <PresetGrid
                current={lampColor}
                on={on}
                onPick={(hex, name) => {
                  haptic.tap();
                  applyColor(hex, name);
                }}
              />
            )}

            <View style={styles.divider} />
            <Text style={[type.overline, { marginBottom: space.sm }]}>Recentes</Text>
            <RecentRow
              colors={recents}
              onPick={(hex) => {
                haptic.tap();
                applyColor(hex);
              }}
            />
          </Card>

          {showVoice && (
            <Card icon="mic-outline" title="Comando de voz" index={2}>
              <VoiceButton
                available={voiceAvailable}
                listening={voice.listening}
                accent={accent}
                onStart={() => {
                  haptic.press();
                  voice.start();
                }}
                onStop={voice.stop}
              />
            </Card>
          )}

          <Text style={styles.footer}>Orion · {config.host || 'sem servidor'}:{config.port}</Text>
        </ScrollView>
      </SafeAreaView>

      <SettingsSheet
        visible={settingsOpen}
        config={config}
        accent={accent}
        onClose={() => setSettingsOpen(false)}
        onSave={async (cfg) => {
          setConfig(cfg);
          await saveConfig(cfg);
          setSettingsOpen(false);
          setMessage({ kind: 'info', text: `Servidor: ${cfg.host}:${cfg.port}` });
          refresh(cfg);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.background },
  screen: { flex: 1, backgroundColor: color.background, overflow: 'hidden' },
  auraLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  content: {
    paddingHorizontal: space.lg + space.xs,
    paddingTop: space.md,
    paddingBottom: space.xxxl,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconButton: { width: touch, height: touch, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: space.lg, marginBottom: space.xl },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm - 2,
    minHeight: 40,
    marginTop: space.sm,
  },
  picker: { width: '100%', maxWidth: 300, alignSelf: 'center', gap: space.xl },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  slider: { flex: 1, height: 28, borderRadius: radius.pill },
  divider: { height: 1, backgroundColor: color.glassBorder, marginTop: space.xl, marginBottom: space.lg },
  footer: { ...type.caption, color: color.subtle, textAlign: 'center', marginTop: space.xl },
});
