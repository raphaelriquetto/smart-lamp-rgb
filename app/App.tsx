import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { Panel3, BrightnessSlider, ColorFormatsObject } from 'reanimated-color-picker';

import { PRESETS } from './src/colors';
import { DEFAULT_CONFIG, LampConfig, getState, loadConfig, saveConfig, setColor, turnOff, turnOn } from './src/orion';
import { parseVoice } from './src/voice/parseVoice';
import { useVoiceCommand, voiceAvailable } from './src/voice/useVoiceCommand';

type Status = { kind: 'idle' | 'busy' | 'ok' | 'error'; text: string };

export default function App() {
  const [config, setConfig] = useState<LampConfig>(DEFAULT_CONFIG);
  const [color, setPickerColor] = useState('#FFFFFF');
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: 'Pronto' });
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Carrega o IP salvo e, se houver, lê a cor atual da lâmpada.
  useEffect(() => {
    loadConfig().then(async (cfg) => {
      setConfig(cfg);
      if (!cfg.host) return setSettingsOpen(true);
      try {
        const s = await getState(cfg);
        if (s.color && /^[0-9A-F]{6}$/i.test(s.color)) setPickerColor(`#${s.color}`);
        setStatus({ kind: 'ok', text: `Lâmpada ${s.state === 'on' ? 'ligada' : 'desligada'}` });
      } catch (e: any) {
        setStatus({ kind: 'error', text: e.message });
      }
    });
  }, []);

  const run = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setStatus({ kind: 'busy', text: `Enviando: ${label}…` });
      try {
        await action();
        setStatus({ kind: 'ok', text: `Comando enviado: ${label}` });
      } catch (e: any) {
        setStatus({ kind: 'error', text: e.message ?? String(e) });
      }
    },
    [],
  );

  const applyColor = useCallback(
    (hex: string, label = hex.toUpperCase()) => {
      setPickerColor(hex);
      run(label, () => setColor(config, hex));
    },
    [config, run],
  );

  const voice = useVoiceCommand({
    onPhrase: (alternatives) => {
      for (const phrase of alternatives) {
        const action = parseVoice(phrase);
        if (!action) continue;
        if (action.type === 'off') return run('desligar (voz)', () => turnOff(config));
        if (action.type === 'on') return run('ligar (voz)', () => turnOn(config));
        return applyColor(action.color.hex, `${action.color.name} (voz)`);
      }
      setStatus({ kind: 'error', text: `Não entendi a cor em “${alternatives[0]}”` });
    },
    onError: (text) => setStatus({ kind: 'error', text }),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Smart Lamp</Text>
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} accessibilityLabel="Configurações">
              <Text style={styles.gear}>⚙</Text>
            </Pressable>
          </View>

          <View style={[styles.glow, { backgroundColor: color, shadowColor: color }]} />

          <ColorPicker value={color} onCompleteJS={(c: ColorFormatsObject) => applyColor(c.hex)} style={styles.picker}>
            <Panel3 centerChannel="saturation" thumbSize={30} />
            <BrightnessSlider style={styles.slider} />
          </ColorPicker>

          <Text style={styles.section}>Cores rápidas</Text>
          <View style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.hex}
                onPress={() => applyColor(p.hex, p.name)}
                style={({ pressed }) => [styles.preset, pressed && { transform: [{ scale: 0.92 }] }]}
                accessibilityLabel={p.name}
              >
                <View style={[styles.swatch, { backgroundColor: p.hex }]} />
                <Text style={styles.presetLabel}>{p.name}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.row}>
            <Pressable style={[styles.button, styles.on]} onPress={() => run('ligar', () => turnOn(config))}>
              <Text style={styles.buttonText}>Ligar</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.off]} onPress={() => run('desligar', () => turnOff(config))}>
              <Text style={styles.buttonText}>Desligar</Text>
            </Pressable>
          </View>

          <Pressable
            onPressIn={voice.start}
            onPressOut={voice.stop}
            style={[styles.mic, voice.listening && styles.micActive, !voiceAvailable && { opacity: 0.4 }]}
          >
            <Text style={styles.micIcon}>🎤</Text>
            <Text style={styles.buttonText}>
              {voice.listening ? 'Ouvindo… solte para enviar' : 'Segure e diga uma cor'}
            </Text>
          </Pressable>

          <View style={styles.status}>
            {status.kind === 'busy' && <ActivityIndicator color="#fff" size="small" />}
            <Text style={[styles.statusText, status.kind === 'error' && { color: '#ff6b6b' }]}>{status.text}</Text>
          </View>
        </ScrollView>

        <SettingsModal
          visible={settingsOpen}
          config={config}
          onClose={() => setSettingsOpen(false)}
          onSave={async (cfg) => {
            setConfig(cfg);
            await saveConfig(cfg);
            setSettingsOpen(false);
            setStatus({ kind: 'idle', text: `Servidor: ${cfg.host}:${cfg.port}` });
          }}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function SettingsModal(props: {
  visible: boolean;
  config: LampConfig;
  onClose: () => void;
  onSave: (cfg: LampConfig) => void;
}) {
  const [draft, setDraft] = useState(props.config);
  useEffect(() => setDraft(props.config), [props.config, props.visible]);

  const field = (key: keyof LampConfig, label: string, keyboard: 'default' | 'numeric' = 'default') => (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={draft[key]}
        onChangeText={(v) => setDraft({ ...draft, [key]: v })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={keyboard}
        placeholderTextColor="#666"
        placeholder={key === 'host' ? 'ex.: 54.207.10.20' : undefined}
      />
    </View>
  );

  return (
    <Modal visible={props.visible} animationType="slide" transparent onRequestClose={props.onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modal}>
          <Text style={styles.section}>Servidor FIWARE</Text>
          {field('host', 'IP público da VM (AWS)')}
          {field('port', 'Porta do Orion', 'numeric')}
          {field('service', 'fiware-service')}
          {field('servicePath', 'fiware-servicepath')}
          {field('entityId', 'ID da entidade')}
          <View style={styles.row}>
            <Pressable style={[styles.button, styles.off]} onPress={props.onClose}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.button, styles.on]} onPress={() => props.onSave(draft)}>
              <Text style={styles.buttonText}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111216' },
  content: { padding: 20, paddingTop: 40, alignItems: 'center' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 26, fontWeight: '700' },
  gear: { color: '#aaa', fontSize: 26 },
  glow: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginVertical: 18,
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  picker: { width: 280, gap: 20 },
  slider: { borderRadius: 12 },
  section: { color: '#ddd', fontSize: 16, fontWeight: '600', alignSelf: 'flex-start', marginTop: 24, marginBottom: 12 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  preset: { alignItems: 'center', width: 64 },
  swatch: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#333' },
  presetLabel: { color: '#bbb', fontSize: 11, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  button: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  on: { backgroundColor: '#2e7d32' },
  off: { backgroundColor: '#3a3b42' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  mic: {
    marginTop: 16,
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    backgroundColor: '#1e5bd8',
    alignItems: 'center',
  },
  micActive: { backgroundColor: '#d81e5b' },
  micIcon: { fontSize: 28, marginBottom: 4 },
  status: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 18, minHeight: 24 },
  statusText: { color: '#9a9ba3', fontSize: 13, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1b1c22', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  label: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: '#26272e', color: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
