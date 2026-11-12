// "Aperte e fale": enquanto o botão está pressionado, o celular escuta em pt-BR.
// Usa expo-speech-recognition, que NÃO existe no Expo Go (precisa de development build).
// Por isso o import é protegido: no Expo Go o botão de voz aparece desabilitado e o resto funciona.
import { useCallback, useEffect, useRef, useState } from 'react';

let Speech: any = null;
try {
  Speech = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {
  Speech = null;
}

export const voiceAvailable = Speech != null;

type Options = { onPhrase: (alternatives: string[]) => void; onError: (msg: string) => void };

export function useVoiceCommand({ onPhrase, onError }: Options) {
  const [listening, setListening] = useState(false);
  const handlers = useRef({ onPhrase, onError });
  handlers.current = { onPhrase, onError };

  useEffect(() => {
    if (!Speech) return;
    const subs = [
      Speech.addListener('start', () => setListening(true)),
      Speech.addListener('end', () => setListening(false)),
      Speech.addListener('result', (e: any) => {
        if (!e.isFinal) return;
        const alternatives = (e.results ?? []).map((r: any) => r.transcript).filter(Boolean);
        if (alternatives.length) handlers.current.onPhrase(alternatives);
      }),
      Speech.addListener('error', (e: any) => {
        setListening(false);
        if (e.error === 'aborted') return;
        const msg =
          e.error === 'no-speech' || e.error === 'speech-timeout'
            ? 'Não ouvi nada. Segure o botão e fale.'
            : e.error === 'not-allowed'
              ? 'Permissão de microfone negada.'
              : `Erro no reconhecimento: ${e.message ?? e.error}`;
        handlers.current.onError(msg);
      }),
    ];
    return () => subs.forEach((s: any) => s?.remove?.());
  }, []);

  const start = useCallback(async () => {
    if (!Speech) {
      handlers.current.onError('Voz indisponível no Expo Go. Use a development build (veja o README).');
      return;
    }
    const perm = await Speech.requestPermissionsAsync();
    if (!perm.granted) {
      handlers.current.onError('Permissão de microfone negada.');
      return;
    }
    Speech.start({ lang: 'pt-BR', interimResults: false, maxAlternatives: 5, continuous: false });
  }, []);

  // Soltar o botão: stop() (não abort) para ainda receber o resultado final.
  const stop = useCallback(() => {
    Speech?.stop();
  }, []);

  return { listening, start, stop };
}
