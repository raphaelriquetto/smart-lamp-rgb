// Luminosidade do ambiente medida pelo LDR do ESP32 (atributo "luminosity" no Orion, 0 a 100).
// Gráfico de uma série só, seguindo a skill de dataviz: linha 2 px + área a 10%, escala fixa 0-100,
// linhas de grade discretas, sem legenda (o título já diz o que é), leitura do ponto ao tocar/passar o mouse,
// e uma visão em tabela para quem não lê o gráfico.
import { ComponentProps, useMemo, useState } from 'react';
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Card } from './Card';
import { color, font, icon, radius, space, type } from '../theme';

export type Reading = { t: number; v: number };

// Âmbar validado pelo validate_palette.js da skill (faixa de luminosidade, croma e contraste no fundo escuro)
const SERIES = '#C4861C';
const CHART_H = 96;
const PAD_TOP = 8;
const PAD_BOTTOM = 8;
const AXIS_W = 28; // espaço dos rótulos 0/50/100 à direita

const hhmmss = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function describe(v: number): { label: string; icon: ComponentProps<typeof Ionicons>['name'] } {
  if (v < 15) return { label: 'Escuro', icon: 'moon-outline' };
  if (v < 40) return { label: 'Penumbra', icon: 'cloudy-night-outline' };
  if (v < 70) return { label: 'Claro', icon: 'partly-sunny-outline' };
  return { label: 'Muito claro', icon: 'sunny-outline' };
}

type Props = { readings: Reading[]; connected: boolean; index?: number };

export function LuminosityCard({ readings, connected, index = 0 }: Props) {
  const [showTable, setShowTable] = useState(false);
  const last = readings[readings.length - 1];

  const stats = useMemo(() => {
    if (!readings.length) return null;
    const vs = readings.map((r) => r.v);
    const minutes = Math.max(1, Math.round((readings[readings.length - 1].t - readings[0].t) / 60000));
    return {
      min: Math.min(...vs),
      max: Math.max(...vs),
      avg: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length),
      minutes,
    };
  }, [readings]);

  const toggle = (
    <Pressable
      onPress={() => setShowTable(!showTable)}
      accessibilityRole="button"
      accessibilityLabel={showTable ? 'Mostrar gráfico' : 'Mostrar tabela de leituras'}
      hitSlop={10}
      style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}
      disabled={!readings.length}
    >
      <Ionicons name={showTable ? 'analytics-outline' : 'list-outline'} size={icon.sm} color={color.mutedForeground} />
      <Text style={type.caption}>{showTable ? 'Gráfico' : 'Tabela'}</Text>
    </Pressable>
  );

  return (
    <Card icon="sunny-outline" title="Luminosidade" index={index} right={readings.length ? toggle : undefined}>
      {!last ? (
        <View style={styles.empty}>
          <Text style={type.body}>{connected ? 'Aguardando a leitura do sensor…' : 'Sem conexão com o servidor.'}</Text>
          <Text style={type.label}>
            O ESP32 envia a luminosidade a cada 5 s. Se nada aparecer, confira se o módulo LDR está ligado no GPIO 34 e se o
            atributo "luminosity" existe no provisionamento.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.headline}>
            <View
              style={styles.valueRow}
              accessible
              accessibilityLabel={`Luminosidade atual ${last.v} por cento, ${describe(last.v).label}`}
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.value}>{last.v}</Text>
              <Text style={styles.unit}>%</Text>
            </View>
            <View style={styles.describe}>
              <Ionicons name={describe(last.v).icon} size={icon.sm} color={color.foreground} />
              <Text style={[type.label, { color: color.foreground }]}>{describe(last.v).label}</Text>
            </View>
          </View>

          {showTable ? <ReadingsTable readings={readings} /> : <Chart readings={readings} />}

          {stats && (
            <View style={styles.stats}>
              {[
                ['Mínima', stats.min],
                ['Média', stats.avg],
                ['Máxima', stats.max],
              ].map(([label, v]) => (
                <View key={label as string} style={styles.stat}>
                  <Text style={type.overline}>{label}</Text>
                  <Text style={styles.statValue}>{v}%</Text>
                </View>
              ))}
              <View style={[styles.stat, { alignItems: 'flex-end' }]}>
                <Text style={type.overline}>Janela</Text>
                <Text style={styles.statValue}>{stats.minutes} min</Text>
              </View>
            </View>
          )}
        </>
      )}
    </Card>
  );
}

function Chart({ readings }: { readings: Reading[] }) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const plotW = Math.max(0, width - AXIS_W);
  const t0 = readings[0].t;
  const t1 = readings[readings.length - 1].t;
  const span = Math.max(1, t1 - t0);
  const x = (t: number) => (readings.length === 1 ? plotW : ((t - t0) / span) * plotW);
  const y = (v: number) => PAD_TOP + (1 - v / 100) * (CHART_H - PAD_TOP - PAD_BOTTOM);

  const { line, area } = useMemo(() => {
    if (!plotW) return { line: '', area: '' };
    const pts = readings.map((r) => `${x(r.t).toFixed(1)},${y(r.v).toFixed(1)}`);
    const linePath = `M${pts.join(' L')}`;
    const base = y(0).toFixed(1);
    const areaPath = `${linePath} L${x(t1).toFixed(1)},${base} L${x(t0).toFixed(1)},${base} Z`;
    return { line: linePath, area: areaPath };
  }, [readings, plotW]);

  // A linha vertical acha o ponto mais próximo do dedo/mouse (ninguém precisa mirar numa linha de 2 px)
  const pick = (px: number) => {
    if (!plotW) return;
    let best = 0;
    let bestD = Infinity;
    readings.forEach((r, i) => {
      const d = Math.abs(x(r.t) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best);
  };
  const onTouch = (e: GestureResponderEvent) => pick(e.nativeEvent.locationX);

  const lastR = readings[readings.length - 1];
  const h = hover !== null ? readings[hover] : null;
  const tipLeft = h ? Math.min(Math.max(x(h.t) - 52, 0), plotW - 104) : 0;

  return (
    <View
      style={styles.chart}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Gráfico da luminosidade com ${readings.length} leituras. Use a tabela para ver os valores.`}
    >
      {width > 0 && (
        <Svg width={width} height={CHART_H}>
          {[0, 50, 100].map((g) => (
            <Line key={g} x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke="rgba(148,163,184,0.18)" strokeWidth={1} />
          ))}
          <Path d={area} fill={SERIES} fillOpacity={0.1} />
          <Path d={line} stroke={SERIES} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {h && <Line x1={x(h.t)} x2={x(h.t)} y1={PAD_TOP} y2={y(0)} stroke="rgba(248,250,252,0.35)" strokeWidth={1} />}
          {/* Ponto do valor atual (ou do ponto tocado), com anel na cor do cartão para destacar da linha */}
          <Circle
            cx={x((h ?? lastR).t)}
            cy={y((h ?? lastR).v)}
            r={4.5}
            fill={SERIES}
            stroke={color.card}
            strokeWidth={2}
          />
        </Svg>
      )}

      {[100, 50, 0].map((g) => (
        <Text key={g} style={[styles.axis, { top: y(g) - 7 }]}>
          {g}
        </Text>
      ))}

      {h && (
        <View style={[styles.tip, { left: tipLeft }]} pointerEvents="none">
          <Text style={styles.tipValue}>{h.v}%</Text>
          <Text style={type.caption}>{hhmmss(h.t)}</Text>
        </View>
      )}

      {/* Camada de toque: responder (celular) + ponteiro (mouse na web) */}
      <View
        style={[StyleSheet.absoluteFill, { right: AXIS_W }]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={onTouch}
        onResponderMove={onTouch}
        onResponderRelease={() => setHover(null)}
        onPointerMove={(e: any) => e.nativeEvent?.pointerType === 'mouse' && pick(e.nativeEvent.offsetX ?? e.nativeEvent.locationX)}
        onPointerLeave={() => setHover(null)}
      />
    </View>
  );
}

function ReadingsTable({ readings }: { readings: Reading[] }) {
  const rows = readings.slice(-8).reverse();
  return (
    <View style={styles.table} accessibilityRole="list">
      <View style={styles.tr}>
        <Text style={[type.overline, styles.tdTime]}>Horário</Text>
        <Text style={[type.overline, styles.tdValue]}>Luminosidade</Text>
      </View>
      {rows.map((r) => (
        <View key={r.t} style={styles.tr}>
          <Text style={[styles.td, styles.tdTime]}>{hhmmss(r.t)}</Text>
          <Text style={[styles.td, styles.tdValue]}>{r.v}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { gap: space.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32 },
  headline: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  value: { fontFamily: font.bold, fontSize: 40, lineHeight: 44, color: color.foreground, letterSpacing: -1 },
  unit: { fontFamily: font.semibold, fontSize: 18, lineHeight: 30, color: color.mutedForeground, marginLeft: 2 },
  describe: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    paddingHorizontal: space.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(248,250,252,0.06)',
    borderWidth: 1,
    borderColor: color.glassBorder,
    marginBottom: 4,
  },
  chart: { height: CHART_H, position: 'relative' },
  axis: { position: 'absolute', right: 0, width: AXIS_W - 6, textAlign: 'right', fontFamily: font.medium, fontSize: 10, color: color.subtle },
  tip: {
    position: 'absolute',
    top: -6,
    width: 104,
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: color.glassStrong,
    borderWidth: 1,
    borderColor: color.glassBorder,
    alignItems: 'center',
  },
  tipValue: { fontFamily: font.bold, fontSize: 14, color: color.foreground },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.lg,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: color.glassBorder,
  },
  stat: { gap: 2 },
  statValue: { fontFamily: font.semibold, fontSize: 15, color: color.foreground },
  table: { gap: 2 },
  tr: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: color.glassBorder },
  td: { fontFamily: font.medium, fontSize: 13, color: color.foreground, fontVariant: ['tabular-nums'] },
  tdTime: { flex: 1 },
  tdValue: { width: 110, textAlign: 'right' },
});
