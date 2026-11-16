// Luz suave: gradiente radial que sai forte do centro e some aos poucos, sem bordas.
// Usado no halo da lâmpada, no "vidro" do botão e no brilho de fundo da tela.
import { useId } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

export type LightStop = { at: number; color: string; opacity: number };

// Curva de queda da luz: muitas paradas pequenas evitam "degraus" no degradê
export function falloff(color: string, peak: number): LightStop[] {
  const curve = [
    [0, 1],
    [0.12, 0.82],
    [0.25, 0.58],
    [0.38, 0.38],
    [0.5, 0.23],
    [0.62, 0.12],
    [0.75, 0.055],
    [0.88, 0.018],
    [1, 0],
  ];
  return curve.map(([at, k]) => ({ at, color, opacity: peak * k }));
}

type Props = {
  width: number;
  height?: number;
  stops: LightStop[];
  /** Centro do brilho, de 0 a 1 (padrão: meio) */
  cx?: number;
  cy?: number;
  style?: StyleProp<ViewStyle>;
};

export function Light({ width, height = width, stops, cx = 0.5, cy = 0.5, style }: Props) {
  // useId gera ":r0:"; dois-pontos quebram url(#...) em alguns navegadores
  const id = `light${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const round = width === height;
  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx={`${cx * 100}%`} cy={`${cy * 100}%`} rx="50%" ry="50%" fx={`${cx * 100}%`} fy={`${cy * 100}%`}>
          {stops.map((s) => (
            <Stop key={s.at} offset={s.at} stopColor={s.color} stopOpacity={s.opacity} />
          ))}
        </RadialGradient>
      </Defs>
      {round ? (
        <Circle cx={width / 2} cy={height / 2} r={width / 2} fill={`url(#${id})`} />
      ) : (
        <Ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} fill={`url(#${id})`} />
      )}
    </Svg>
  );
}
