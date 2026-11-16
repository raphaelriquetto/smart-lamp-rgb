// Simulador do Smart Lamp: faz o papel da VM (Orion + site) e do ESP32, sem AWS e sem hardware.
//
//   http://localhost:8080   o app (mesmo site que roda na VM, de web/site)
//   http://localhost:1026   a lâmpada virtual: mostra a cor do "LED" e os comandos recebidos
//
// Orion simulado (porta 1026) entende só o que o app e a collection usam:
//   GET   /version
//   GET   /v2/entities/urn:ngsi-ld:Lamp:001[?attrs=...&options=keyValues]
//   PATCH /v2/entities/urn:ngsi-ld:Lamp:001/attrs   com os comandos on, off e color
// Como o firmware de verdade, cada comando fica PENDING por um instante e depois OK.
//
// Uso: node simulador/servidor.mjs   (ou scripts\simular.cmd). Sem dependências.

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, '..', 'web', 'site');
const ORION_PORT = 1026;
const SITE_PORT = 8080;
const ENTITY = 'urn:ngsi-ld:Lamp:001';
const ESP32_DELAY_MS = 350; // tempo que o "ESP32" leva para confirmar o comando

const lamp = {
  id: ENTITY,
  type: 'Lamp',
  state: 'off',
  color: 'FFFFFF',
  luminosity: 42,
  on_status: 'UNKNOWN',
  off_status: 'UNKNOWN',
  color_status: 'UNKNOWN',
  color_info: '',
};
const history = []; // últimos comandos, para a página da lâmpada

// Sensor LDR simulado: a luz do ambiente varia devagar; com a lâmpada ligada, o sensor recebe um pouco mais de luz.
// Na página da lâmpada virtual dá para fixar o valor (como tampar o sensor ou acender a luz da sala).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let ambient = 42;
let manual = null; // null = automático
function updateLuminosity() {
  if (manual === null) ambient = clamp(ambient + (Math.random() - 0.5) * 6, 8, 92);
  const base = manual ?? ambient;
  lamp.luminosity = Math.round(clamp(base + (lamp.state === 'on' ? 8 : 0), 0, 100));
}
setInterval(updateLuminosity, 5000); // mesmo ritmo do firmware

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Fiware-Service, Fiware-ServicePath, Accept',
  'Access-Control-Max-Age': '600',
};

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { ...CORS, 'Content-Type': type });
  res.end(type === 'application/json' && body !== undefined ? JSON.stringify(body) : body);
};

const readBody = (req) =>
  new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });

const time = () => new Date().toLocaleTimeString('pt-BR');

function log(text, ok = true) {
  history.unshift({ at: time(), text, ok });
  history.length = Math.min(history.length, 15);
  console.log(`[${time()}] ${ok ? '✔' : '✖'} ${text}`);
}

// Mesma lógica do firmware: "on" volta para a última cor, "off" apaga, "color" troca (000000 = apagar).
function command(name, value) {
  lamp[`${name}_status`] = 'PENDING';
  setTimeout(() => {
    if (name === 'on') lamp.state = 'on';
    if (name === 'off') lamp.state = 'off';
    if (name === 'color') {
      const hex = String(value).replace('#', '').toUpperCase();
      if (!/^[0-9A-F]{6}$/.test(hex)) {
        lamp.color_status = 'OK';
        lamp.color_info = 'invalid color';
        return log(`color ${value}: cor inválida`, false);
      }
      if (hex === '000000') lamp.state = 'off';
      else {
        lamp.color = hex;
        lamp.state = 'on';
      }
      lamp.color_info = hex;
    }
    lamp[`${name}_status`] = 'OK';
  }, ESP32_DELAY_MS);
  log(name === 'color' ? `color → #${String(value).replace('#', '').toUpperCase()}` : name);
}

function pickAttrs(url) {
  const wanted = url.searchParams.get('attrs');
  const keys = wanted ? wanted.split(',') : Object.keys(lamp).filter((k) => k !== 'id' && k !== 'type');
  const out = {};
  if (!wanted) Object.assign(out, { id: lamp.id, type: lamp.type });
  for (const k of keys) if (k in lamp) out[k] = lamp[k];
  return out;
}

const orion = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return send(res, 204, '');

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, LAMP_PAGE, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/estado') return send(res, 200, { ...lamp, history, ldrManual: manual !== null });
  // /ldr?v=30 fixa o sensor em 30%; /ldr?v=auto volta ao automático
  if (req.method === 'GET' && url.pathname === '/ldr') {
    const v = url.searchParams.get('v');
    const previous = manual;
    manual = v === 'auto' || v === null ? null : clamp(Number(v) || 0, 0, 100);
    // Voltando ao automático, continua da luz do ambiente que estava fixada (sem o brilho extra da lâmpada)
    if (manual === null && previous !== null) ambient = previous;
    updateLuminosity(); // como o firmware: mudança brusca é publicada na hora
    log(manual === null ? 'LDR: automático' : `LDR: luz do ambiente em ${manual}%`);
    return send(res, 200, { luminosity: lamp.luminosity, manual: manual !== null });
  }
  if (req.method === 'GET' && url.pathname === '/version') {
    return send(res, 200, { orion: { version: 'simulador', uptime: `${Math.round(process.uptime())}s` } });
  }

  const m = url.pathname.match(/^\/v2\/entities\/([^/]+)(\/attrs)?$/);
  if (!m) return send(res, 404, { error: 'BadRequest', description: 'service not found' });
  if (decodeURIComponent(m[1]) !== ENTITY) {
    return send(res, 404, { error: 'NotFound', description: 'The requested entity has not been found. Check type and id' });
  }

  if (req.method === 'GET' && !m[2]) return send(res, 200, pickAttrs(url));

  if (req.method === 'PATCH' && m[2]) {
    let body;
    try {
      body = JSON.parse((await readBody(req)) || '{}');
    } catch {
      return send(res, 400, { error: 'ParseError', description: 'Errors found in incoming JSON buffer' });
    }
    const unknown = Object.keys(body).filter((k) => !['on', 'off', 'color'].includes(k));
    if (unknown.length) {
      log(`atributo desconhecido: ${unknown.join(', ')}`, false);
      return send(res, 422, {
        error: 'Unprocessable',
        description: `one or more of the attributes in the request do not exist: ${unknown.join(', ')}`,
      });
    }
    for (const [name, attr] of Object.entries(body)) command(name, attr?.value ?? '');
    res.writeHead(204, CORS);
    return res.end();
  }

  send(res, 405, { error: 'MethodNotAllowed', description: 'method not allowed' });
});

// Site do app: arquivos estáticos de web/site, como o nginx da VM
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
};
const site = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let file = path.join(SITE, rel);
  if (!file.startsWith(SITE)) return send(res, 403, 'proibido', 'text/plain');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(SITE, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function fail(port) {
  return (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\nA porta ${port} já está em uso. Feche o outro programa (ou outro simulador) e tente de novo.`);
    } else console.error(err);
    process.exit(1);
  };
}

if (!fs.existsSync(path.join(SITE, 'index.html'))) {
  console.error(`Não encontrei o site em ${SITE}. Rode scripts\\gerar-web.cmd antes.`);
  process.exit(1);
}

orion.on('error', fail(ORION_PORT)).listen(ORION_PORT, '0.0.0.0', () => {
  site.on('error', fail(SITE_PORT)).listen(SITE_PORT, '0.0.0.0', () => {
    const lan = Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address);
    console.log('\n  Simulador do Smart Lamp rodando (Ctrl+C para parar)\n');
    console.log(`  App ............. http://localhost:${SITE_PORT}`);
    console.log(`  Lâmpada virtual . http://localhost:${ORION_PORT}`);
    for (const ip of lan) console.log(`  No celular (mesmo Wi-Fi): http://${ip}:${SITE_PORT}   lâmpada: http://${ip}:${ORION_PORT}`);
    console.log('');
  });
});

const LAMP_PAGE = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lâmpada virtual</title>
<style>
  :root { --bg:#0F172A; --fg:#F8FAFC; --muted:#94A3B8; --line:rgba(255,255,255,.1); --c:#FFFFFF; }
  * { box-sizing:border-box }
  body { margin:0; min-height:100vh; background:var(--bg); color:var(--fg);
    font:15px/1.5 "Plus Jakarta Sans","Segoe UI",system-ui,sans-serif; display:flex; flex-direction:column; align-items:center; padding:28px 16px; }
  .eyebrow { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted) }
  h1 { margin:4px 0 24px; font-size:26px; letter-spacing:-.4px }
  .stage { position:relative; width:260px; height:260px; display:grid; place-items:center; }
  .halo { position:absolute; inset:0; border-radius:50%; background:radial-gradient(circle, var(--c) 0%, transparent 68%);
    opacity:.55; transition:opacity .3s, background .3s; }
  .led { width:120px; height:120px; border-radius:50%; background:var(--c); border:2px solid rgba(255,255,255,.35);
    box-shadow:0 0 60px 10px var(--c); transition:background .3s, box-shadow .3s; }
  .off .halo { opacity:0 } .off .led { background:#1E293B; box-shadow:none; border-color:var(--line) }
  .info { text-align:center; margin:18px 0 22px } .info b { font-size:22px; display:block } .info span { color:var(--muted); letter-spacing:1px }
  .panel { width:100%; max-width:440px; border:1px solid var(--line); border-radius:16px; padding:14px 16px; background:rgba(30,41,59,.55) }
  .panel h2 { font-size:13px; margin:0 0 8px; color:var(--muted); font-weight:700; letter-spacing:1px; text-transform:uppercase }
  ul { list-style:none; margin:0; padding:0; font:13px "Cascadia Mono",Consolas,monospace }
  li { padding:5px 0; border-top:1px solid var(--line); display:flex; gap:10px } li:first-child { border-top:0 }
  li time { color:var(--muted) } li.err { color:#F87171 }
  .empty { color:var(--muted); font-family:inherit }
  .status { margin-top:10px; font-size:12px; color:var(--muted) }
  .ldr { margin-bottom:14px }
  .ldr .row { display:flex; align-items:baseline; justify-content:space-between }
  .ldr .val { font-size:28px; font-weight:700 }
  .ldr input { width:100%; margin:10px 0 6px; accent-color:#C4861C }
  .ldr button { background:transparent; color:var(--fg); border:1px solid var(--line); border-radius:999px; padding:6px 12px; font:inherit; font-size:13px; cursor:pointer }
  .ldr button[aria-pressed="true"] { background:rgba(248,250,252,.1) }
  .hint { font-size:12px; color:var(--muted) }
</style></head>
<body class="off">
  <div class="eyebrow">Simulador · ESP32 + LED RGB</div>
  <h1>Lâmpada virtual</h1>
  <div class="stage"><div class="halo"></div><div class="led"></div></div>
  <div class="info"><b id="state">Desligada</b><span id="hex">#FFFFFF</span></div>
  <div class="panel ldr">
    <h2>Sensor de luz (LDR)</h2>
    <div class="row"><span class="val" id="ldr">--%</span><button id="auto" aria-pressed="true">Automático</button></div>
    <input id="slider" type="range" min="0" max="100" value="42" aria-label="Luz do ambiente">
    <div class="hint">Arraste para simular a luz do ambiente (0 = sensor tampado). O app mostra o valor em até 5 s.</div>
  </div>
  <div class="panel"><h2>Comandos recebidos</h2><ul id="log"><li class="empty">Nenhum comando ainda. Use o app em http://localhost:8080</li></ul>
  <div class="status" id="status"></div></div>
<script>
  async function tick() {
    try {
      const s = await (await fetch('/estado')).json();
      document.body.classList.toggle('off', s.state !== 'on');
      document.documentElement.style.setProperty('--c', '#' + s.color);
      document.getElementById('state').textContent = s.state === 'on' ? 'Ligada' : 'Desligada';
      document.getElementById('hex').textContent = '#' + s.color;
      document.getElementById('status').textContent = 'color_status: ' + s.color_status + ' · on_status: ' + s.on_status + ' · off_status: ' + s.off_status;
      document.getElementById('ldr').textContent = s.luminosity + '%';
      document.getElementById('auto').setAttribute('aria-pressed', String(!s.ldrManual));
      if (!dragging) document.getElementById('slider').value = s.luminosity;
      const ul = document.getElementById('log');
      if (s.history.length) ul.innerHTML = s.history.map(h => '<li class="' + (h.ok ? '' : 'err') + '"><time>' + h.at + '</time>' + h.text.replace(/</g,'&lt;') + '</li>').join('');
    } catch (e) { document.getElementById('status').textContent = 'Simulador parado.'; }
  }
  let dragging = false;
  const slider = document.getElementById('slider');
  slider.addEventListener('input', () => { dragging = true; });
  slider.addEventListener('change', async () => { await fetch('/ldr?v=' + slider.value); dragging = false; tick(); });
  document.getElementById('auto').addEventListener('click', async () => { await fetch('/ldr?v=auto'); tick(); });
  tick(); setInterval(tick, 400);
</script>
</body></html>`;
