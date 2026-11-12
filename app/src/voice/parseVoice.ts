// Transforma a frase falada ("deixa a luz azul", "desliga") em uma ação.
import { PRESETS, VOICE_EXTRAS, type NamedColor } from '../colors';

export type VoiceAction =
  | { type: 'color'; color: NamedColor }
  | { type: 'on' }
  | { type: 'off' };

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ');

const hasWord = (text: string, word: string) => new RegExp(`\\b${word}\\b`).test(text);

const OFF_WORDS = ['desliga', 'desligar', 'desligue', 'apaga', 'apagar', 'apague'];
const ON_WORDS = ['liga', 'ligar', 'ligue', 'acende', 'acender', 'acenda'];

// Aliases mais longos primeiro: "azul claro" precisa ganhar de "azul".
const COLOR_ALIASES = [...PRESETS, ...VOICE_EXTRAS]
  .flatMap((color) => color.aliases.map((alias) => ({ alias, color })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function parseVoice(phrase: string): VoiceAction | null {
  const text = normalize(phrase);
  if (OFF_WORDS.some((w) => hasWord(text, w))) return { type: 'off' };
  const match = COLOR_ALIASES.find(({ alias }) => hasWord(text, alias));
  if (match) return { type: 'color', color: match.color };
  if (ON_WORDS.some((w) => hasWord(text, w))) return { type: 'on' };
  return null;
}
