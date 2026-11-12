// Cliente mínimo do Orion Context Broker (NGSI-v2).
// O app NUNCA fala com o ESP32 direto: ele só faz PATCH no Orion (porta 1026),
// que repassa o comando ao IoT Agent -> Mosquitto -> ESP32.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toDeviceHex } from './colors';

export type LampConfig = {
  host: string; // IP público da VM na AWS, ex.: 54.123.45.67
  port: string;
  service: string; // fiware-service
  servicePath: string; // fiware-servicepath
  entityId: string;
};

export const DEFAULT_CONFIG: LampConfig = {
  host: '',
  port: '1026',
  service: 'smart',
  servicePath: '/',
  entityId: 'urn:ngsi-ld:Lamp:001',
};

const STORAGE_KEY = 'smart-lamp-config';

export async function loadConfig(): Promise<LampConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveConfig(cfg: LampConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

function baseUrl(cfg: LampConfig) {
  if (!cfg.host) throw new Error('Configure o IP do servidor (ícone ⚙).');
  return `http://${cfg.host.trim()}:${cfg.port.trim()}/v2/entities/${cfg.entityId.trim()}`;
}

function headers(cfg: LampConfig, json = false): Record<string, string> {
  const h: Record<string, string> = {
    'fiware-service': cfg.service,
    'fiware-servicepath': cfg.servicePath,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function request(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Orion respondeu ${res.status} ${body}`.trim());
    }
    return res;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new Error('Tempo esgotado: o servidor não respondeu.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** Mesmo request da pasta 4 da collection: PATCH /v2/entities/<id>/attrs */
async function sendCommand(cfg: LampConfig, command: string, value = '') {
  await request(`${baseUrl(cfg)}/attrs`, {
    method: 'PATCH',
    headers: headers(cfg, true),
    body: JSON.stringify({ [command]: { type: 'command', value } }),
  });
}

export const turnOn = (cfg: LampConfig) => sendCommand(cfg, 'on');
export const turnOff = (cfg: LampConfig) => sendCommand(cfg, 'off');
/** Envia "lamp001@color|FF8800" para o ESP32. */
export const setColor = (cfg: LampConfig, hex: string) => sendCommand(cfg, 'color', toDeviceHex(hex));

export type LampState = { state?: string; color?: string; color_status?: string };

/** Lê o estado atual que o ESP32 reportou (atributos s -> state, c -> color). */
export async function getState(cfg: LampConfig): Promise<LampState> {
  const res = await request(`${baseUrl(cfg)}?attrs=state,color,color_status&options=keyValues`, {
    method: 'GET',
    headers: headers(cfg),
  });
  return res.json();
}
