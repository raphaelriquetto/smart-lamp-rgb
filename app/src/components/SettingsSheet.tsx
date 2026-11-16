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
import { Ionicons } from '@expo/vector-icons';
import { getState, LampConfig } from '../orion';
import { theme, withAlpha } from '../theme';

type Props = {
  visible: boolean;
  config: LampConfig;
  accent: string;
  onClose: () => void;
  onSave: (cfg: LampConfig) => void;
};

type Test = { kind: 'idle' | 'busy' | 'ok' | 'error'; text?: string };

export function SettingsSheet({ visible, config, accent, onClose, onSave }: Props) {
  const [draft, setDraft] = useState(config);
  const [test, setTest] = useState<Test>({ kind: 'idle' });
  const [advanced, setAdvanced] = useState(false);

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
      setTest({ kind: 'ok', text: `Lâmpada encontrada (${s.state ?? 'sem estado'}${s.color ? `, ${s.color}` : ''})` });
    } catch (e: any) {
      setTest({ kind: 'error', text: e.message ?? String(e) });
    }
  };

  const field = (key: keyof LampConfig, label: string, placeholder?: string, numeric = false) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={draft[key]}
        onChangeText={(v) => setDraft({ ...draft, [key]: v })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={theme.faint}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fechar" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Servidor FIWARE</Text>
            <Text style={styles.subtitle}>O app envia os comandos para o Orion na sua VM da AWS.</Text>

            {field('host', 'IP público da VM', 'ex.: 54.207.10.20')}

            <Pressable onPress={() => setAdvanced(!advanced)} style={styles.advancedToggle}>
              <Text style={styles.advancedText}>Avançado</Text>
              <Ionicons name={advanced ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
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
                style={[
                  styles.testBox,
                  test.kind === 'ok' && { borderColor: withAlpha(theme.success, 0.4) },
                  test.kind === 'error' && { borderColor: withAlpha(theme.danger, 0.4) },
                ]}
              >
                {test.kind === 'busy' ? (
                  <ActivityIndicator color={theme.muted} />
                ) : (
                  <Ionicons
                    name={test.kind === 'ok' ? 'checkmark-circle' : 'alert-circle'}
                    size={18}
                    color={test.kind === 'ok' ? theme.success : theme.danger}
                  />
                )}
                <Text style={styles.testText}>{test.kind === 'busy' ? 'Testando…' : test.text}</Text>
              </View>
            )}

            <View style={styles.buttons}>
              <Pressable style={[styles.button, styles.secondary]} onPress={runTest} disabled={!draft.host}>
                <Ionicons name="pulse" size={18} color={theme.text} />
                <Text style={styles.buttonText}>Testar conexão</Text>
              </Pressable>
              <Pressable style={[styles.button, { backgroundColor: accent }]} onPress={() => onSave(draft)}>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.buttonText}>Salvar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 34,
    maxHeight: '88%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border, alignSelf: 'center', marginBottom: 16 },
  title: { color: theme.text, fontSize: 20, fontWeight: '700' },
  subtitle: { color: theme.muted, fontSize: 13, marginTop: 4, marginBottom: 18 },
  field: { marginBottom: 14 },
  label: { color: theme.muted, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: theme.cardHigh,
    color: theme.text,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
  },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  advancedText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  testBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: theme.cardHigh,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 6,
  },
  testText: { color: theme.text, fontSize: 13, flex: 1 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  secondary: { backgroundColor: theme.cardHigh, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
