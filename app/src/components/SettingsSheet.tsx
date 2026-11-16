// Folha de configurações: IP da VM e cabeçalhos FIWARE, com botão "Testar conexão".
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Glass } from './Glass';
import { getState, LampConfig } from '../orion';
import { color, font, icon, isLight, radius, space, touch, type, withAlpha } from '../theme';

type Props = {
  visible: boolean;
  config: LampConfig;
  accent: string;
  onClose: () => void;
  onSave: (cfg: LampConfig) => void;
};

type Test = { kind: 'idle' | 'busy' | 'ok' | 'error'; text?: string };

export function SettingsSheet({ visible, config, accent, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(config);
  const [test, setTest] = useState<Test>({ kind: 'idle' });
  const [advanced, setAdvanced] = useState(false);
  const [focused, setFocused] = useState<keyof LampConfig | null>(null);

  useEffect(() => {
    if (visible) {
      setDraft(config);
      setTest({ kind: 'idle' });
    }
  }, [visible, config]);

  const runTest = async () => {
    setTest({ kind: 'busy' });
    try {
      const s = await getState(draft);
      setTest({ kind: 'ok', text: `Lâmpada encontrada (${s.state ?? 'sem estado'}${s.color ? `, #${s.color}` : ''})` });
    } catch (e: any) {
      setTest({ kind: 'error', text: e.message ?? String(e) });
    }
  };

  const field = (key: keyof LampConfig, label: string, placeholder?: string, numeric = false) => (
    <View style={styles.field}>
      <Text style={type.label} nativeID={`label-${key}`}>
        {label}
      </Text>
      <TextInput
        style={[styles.input, focused === key && { borderColor: accent, backgroundColor: withAlpha(accent, 0.06) }]}
        value={draft[key]}
        onChangeText={(v) => setDraft({ ...draft, [key]: v })}
        onFocus={() => setFocused(key)}
        onBlur={() => setFocused(null)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={color.subtle}
        accessibilityLabelledBy={`label-${key}`}
        accessibilityLabel={label}
      />
    </View>
  );

  const onAccent = isLight(accent) ? color.background : color.foreground;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar configurações" />
        <Glass strong intensity={50} style={[styles.sheet, { paddingBottom: space.xl + insets.bottom }]}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.titleRow}>
              <View style={[styles.badge, { backgroundColor: withAlpha(accent, 0.16) }]}>
                <Ionicons name="server-outline" size={icon.md} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={type.title}>Servidor FIWARE</Text>
                <Text style={type.label}>O app envia os comandos para o Orion na VM da AWS.</Text>
              </View>
            </View>

            {field('host', 'IP público da VM', 'ex.: 54.207.10.20')}

            <Pressable
              onPress={() => setAdvanced(!advanced)}
              style={styles.advancedToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: advanced }}
            >
              <Text style={styles.advancedText}>Configurações avançadas</Text>
              <Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={icon.sm} color={color.mutedForeground} />
            </Pressable>
            {advanced && (
              <>
                {field('port', 'Porta do Orion', '1026', true)}
                {field('service', 'fiware-service', 'smart')}
                {field('servicePath', 'fiware-servicepath', '/')}
                {field('entityId', 'ID da entidade', 'urn:ngsi-ld:Lamp:001')}
              </>
            )}

            {test.kind !== 'idle' && (
              <View
                accessibilityLiveRegion="polite"
                style={[
                  styles.testBox,
                  test.kind === 'ok' && {
                    borderColor: withAlpha(color.success, 0.4),
                    backgroundColor: withAlpha(color.success, 0.08),
                  },
                  test.kind === 'error' && {
                    borderColor: withAlpha(color.danger, 0.4),
                    backgroundColor: withAlpha(color.danger, 0.08),
                  },
                ]}
              >
                {test.kind === 'busy' ? (
                  <ActivityIndicator color={color.mutedForeground} />
                ) : (
                  <Ionicons
                    name={test.kind === 'ok' ? 'checkmark-circle' : 'alert-circle'}
                    size={icon.md}
                    color={test.kind === 'ok' ? color.success : color.danger}
                  />
                )}
                <Text style={[type.body, { flex: 1, fontSize: 14 }]}>
                  {test.kind === 'busy' ? 'Testando conexão…' : test.text}
                </Text>
              </View>
            )}

            <View style={styles.buttons}>
              <Pressable
                style={({ pressed }) => [styles.button, styles.secondary, { opacity: !draft.host ? 0.4 : pressed ? 0.7 : 1 }]}
                onPress={runTest}
                disabled={!draft.host}
                accessibilityRole="button"
                accessibilityState={{ disabled: !draft.host }}
              >
                <Ionicons name="pulse" size={icon.sm} color={color.foreground} />
                <Text style={styles.buttonText}>Testar conexão</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.button, { backgroundColor: accent, opacity: pressed ? 0.85 : 1 }]}
                onPress={() => onSave(draft)}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark" size={icon.sm} color={onAccent} />
                <Text style={[styles.buttonText, { color: onAccent }]}>Salvar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Glass>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: color.scrim, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: space.xl,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl },
  badge: { width: touch, height: touch, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  field: { marginBottom: space.lg, gap: space.sm - 2 },
  input: {
    minHeight: touch,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    color: color.foreground,
    fontFamily: font.medium,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    fontSize: 16,
    borderWidth: 1,
    borderColor: color.glassBorder,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: 40,
    alignSelf: 'flex-start',
    marginBottom: space.sm,
  },
  advancedText: { fontFamily: font.semibold, fontSize: 13, color: color.mutedForeground },
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.glassBorder,
    marginBottom: space.sm,
  },
  buttons: { flexDirection: 'row', gap: space.md, marginTop: space.md },
  button: {
    flex: 1,
    minHeight: touch,
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  secondary: { backgroundColor: 'rgba(248,250,252,0.06)', borderWidth: 1, borderColor: color.glassBorder },
  buttonText: { fontFamily: font.bold, fontSize: 15, color: color.foreground },
});
