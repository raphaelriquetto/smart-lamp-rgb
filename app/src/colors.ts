// Cores fixas (botões) e vocabulário do comando de voz.

export type NamedColor = {
  name: string;
  hex: string; // #RRGGBB
  aliases: string[]; // palavras reconhecidas pela voz (sem acento, minúsculas)
};

// Primárias (RGB) + secundárias (CMY) + branco: aparecem como botões na tela.
export const PRESETS: NamedColor[] = [
  { name: 'Vermelho', hex: '#FF0000', aliases: ['vermelho', 'vermelha'] },
  { name: 'Verde', hex: '#00FF00', aliases: ['verde'] },
  { name: 'Azul', hex: '#0000FF', aliases: ['azul'] },
  { name: 'Amarelo', hex: '#FFFF00', aliases: ['amarelo', 'amarela'] },
  { name: 'Ciano', hex: '#00FFFF', aliases: ['ciano', 'azul claro', 'turquesa'] },
  { name: 'Magenta', hex: '#FF00FF', aliases: ['magenta', 'rosa', 'pink'] },
  { name: 'Branco', hex: '#FFFFFF', aliases: ['branco', 'branca'] },
];

// Só pela voz (não viram botão, mas é legal reconhecer).
export const VOICE_EXTRAS: NamedColor[] = [
  { name: 'Laranja', hex: '#FF6000', aliases: ['laranja'] },
  { name: 'Roxo', hex: '#8000FF', aliases: ['roxo', 'roxa', 'violeta', 'lilas'] },
];

/** Converte qualquer hex do picker ("#rgb", "#rrggbb", "#rrggbbaa") em "RRGGBB". */
export function toDeviceHex(hex: string): string {
  let h = hex.replace('#', '').trim();
  if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((c) => c + c).join('');
  return h.slice(0, 6).toUpperCase();
}
