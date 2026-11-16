import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ColorPicker, { BrightnessSlider, ColorFormatsObject, Panel3 } from 'reanimated-color-picker';

import { colorName, haptic, isLight, theme, withAlpha } from './src/theme';
import { DEFAULT_CONFIG, LampConfig, getState, loadConfig, saveConfig, setColor, turnOff, turnOn } from './src/orion';
import { parseVoice } from './src/voice/parseVoice';
import { useVoiceCommand, voiceAvailable } from './src/voice/useVoiceCommand';
import { LampHero } from './src/components/LampHero';
import { Card } from './src/components/Card';
import { PresetGrid, RecentRow } from './src/components/Swatches';
import { VoiceButton } from './src/components/VoiceButton';
import { Connection, StatusPill } from './src/components/StatusPill';
import { SettingsSheet } from './src/components/SettingsSheet';

const RECENTS_KEY = 'smart-lamp-recents';
const MAX_RECENTS = 6;
const DEFAULT_ACCENT = '#7C5CFF';

type Message = { kind: 'info' | 'ok' | 'error'; text: string };

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Home />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Home() {
  const [config, setConfig] = useState<LampConfig>(DEFAULT_CONFIG);
  const [color, setPickerColor] = useState('#FFFFFF');
  const [on, setOn] = useState(false);
  const [connection, setConnection] = useState<Connection>('unknown');
  const [message, setMessage] = useState<Message>({ kind: 'info', text: 'Toque na lâmpada ou escolha uma cor' });
  const [recents, setRecents] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Cor de destaque da interface acompanha a lâmpada (cores muito claras usam o roxo padrão).
  const accent = on && !isLight(color) ? color.slice(0, 7) : DEFAULT_ACCENT;

  const refresh = useCallback(async (cfg: LampConfig) => {
    if (!cfg.host) return setConnection('unknown');
    try {
      const s = await getState(cfg);
      if (s.color && /^[0-9A-F]{6}$/i.test(s.color)) setPickerColor(`#${s.color.toUpperCase()}`);
      setOn(s.state === 'on');
      setConnection('online');
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

  const send = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setConnection('sending');
      try {
        await action();
        setConnection('online');
        setMessage({ kind: 'ok', text: label });
        haptic.ok();
      } catch (e: any) {
        setConnection('offline');
        setMessage({ kind: 'error', text: e.message ?? String(e) });
        haptic.error();
      }
    },
    [],
  );

  const applyColor = useCallback(
    (hex: string, name?: string) => {
      const h = hex.slice(0, 7).toUpperCase();
      setPickerColor(h);
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
  const messageColor = message.kind === 'ok' ? theme.success : message.kind === 'error' ? theme.danger : theme.muted;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Brilho ambiente no topo, na cor da lâmpada: círculos sobrepostos imitam um degradê suave */}
      {[760, 620, 480].map((size) => (
        <View
          key={size}
          pointerEvents="none"
          style={[
            styles.aura,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              top: -size / 2 + 40,
              backgroundColor: withAlpha(on ? color : theme.off, on ? 0.045 : 0.025),
            },
          ]}
        />
      ))}

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>FIWARE · {config.entityId.split(':').pop()}</Text>
              <Text style={styles.title}>Smart Lamp</Text>
            </View>
            <View style={styles.headerRight}>
              <StatusPill state={connection} />
              <Pressable
                onPress={() => setSettingsOpen(true)}
                style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
                accessibilityLabel="Configurações"
              >
                <Ionicons name="settings-outline" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 18 }}>
            <LampHero color={color} on={on} onToggle={toggle} />
          </View>

          <View style={styles.message}>
            <Ionicons name={messageIcon} size={15} color={messageColor} />
            <Text style={[styles.messageText, { color: messageColor }]} numberOfLines={2}>
              {message.text}
            </Text>
          </View>

          <Card icon="color-palette-outline" title="Roda de cores">
            <ColorPicker
              value={color}
              onCompleteJS={(c: ColorFormatsObject) => applyColor(c.hex)}
              style={styles.picker}
            >
              <Panel3 centerChannel="saturation" thumbSize={32} thumbShape="circle" />
              <View style={styles.sliderRow}>
                <Ionicons name="sunny-outline" size={16} color={theme.muted} />
                <BrightnessSlider style={styles.slider} thumbSize={26} />
                <Ionicons name="sunny" size={20} color={theme.muted} />
              </View>
            </ColorPicker>
          </Card>

          <Card icon="sparkles-outline" title="Cores rápidas">
            <PresetGrid
              current={color}
              on={on}
              onPick={(hex, name) => {
                haptic.tap();
                applyColor(hex, name);
              }}
            />
          </Card>

          <Card icon="time-outline" title="Recentes">
            <RecentRow
              colors={recents}
              onPick={(hex) => {
                haptic.tap();
                applyColor(hex);
              }}
            />
          </Card>

          {Platform.OS !== 'web' && (
            <Card icon="mic-outline" title="Comando de voz">
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
  screen: { flex: 1, backgroundColor: theme.bg, overflow: 'hidden' },
  aura: { position: 'absolute', alignSelf: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { color: theme.muted, fontSize: 12, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: theme.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  message: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 36, marginTop: 4 },
  messageText: { fontSize: 13, textAlign: 'center', flexShrink: 1 },
  picker: { width: '100%', maxWidth: 300, alignSelf: 'center', gap: 22 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slider: { flex: 1, height: 26, borderRadius: 13 },
});
