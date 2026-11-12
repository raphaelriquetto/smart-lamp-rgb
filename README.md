# Smart Lamp RGB: app + firmware

Extensão do [FIWARE Made Simple](https://github.com/fabiocabrini/fiware-made-simple) para controlar a cor de um LED RGB pelo celular, com roda de cores, botões de cor fixa e comando de voz.

```
App (celular) --HTTP PATCH--> Orion :1026 --> IoT Agent --MQTT--> Mosquitto :1883 <--MQTT-- ESP32
                                (VM na AWS: tudo em Docker)                        (conexão de saída)
```

O app não fala com o ESP32 direto. Ele faz o mesmo `PATCH` da pasta 4 da collection. Quem abre a conexão com o broker é o ESP32, por isso ele funciona atrás do Wi-Fi de casa ou da faculdade.

## Pastas

| Pasta | O que é |
|---|---|
| `firmware/smart_lamp_rgb/` | Sketch do ESP32 com LED RGB e o comando `color` |
| `postman/` | Requisições para reprovisionar o `lamp001` com `color` e testar |
| `app/` | Arquivos do app Expo (React Native): `App.tsx`, `app.json` e `src/` |

## 1. Contrato novo

| | Antes | Agora |
|---|---|---|
| Comandos | `on`, `off` | `on`, `off`, `color` (valor `RRGGBB`) |
| Atributos | `s` → `state`, `l` → `luminosity` | + `c` → `color` |
| MQTT do comando | `lamp001@on\|` | `lamp001@color\|0000FF` |

Exemplo de troca de cor (o que o app envia):

```http
PATCH http://<IP>:1026/v2/entities/urn:ngsi-ld:Lamp:001/attrs
fiware-service: smart
fiware-servicepath: /
Content-Type: application/json

{ "color": { "type": "command", "value": "0000FF" } }
```

## 2. Reprovisionar o device (uma vez)

O IoT Agent só repassa comandos que foram declarados no provisionamento. Importe `postman/Smart Lamp RGB.postman_collection.json`, ajuste a variável `url` para o IP da VM e rode **R.1 → R.2 → R.3**. Depois teste com **R.4** e confira com **R.5** (`color_status` deve ficar `OK`).

## 3. Firmware

1. Ligue o LED RGB: R → GPIO 25, G → GPIO 26, B → GPIO 27, cada um com um resistor de 220 Ω a 330 Ω. A perna comum vai no GND (cátodo comum) ou no 3V3 (ânodo comum).
2. Em `smart_lamp_rgb.ino`, preencha o Wi-Fi e o IP da VM. Se o LED for de ânodo comum, ponha `COMMON_ANODE = true`. Sinal de ânodo comum configurado errado: as cores saem invertidas (azul vira amarelo).
3. Grave pela Arduino IDE (placa *DOIT ESP32 DEVKIT V1*, biblioteca *PubSubClient*). Ao ligar, o LED pisca vermelho, verde e azul.

## 4. App

Precisa do [Node.js LTS](https://nodejs.org) no computador e do app **Expo Go** (Play Store / App Store) no celular. A pasta `app/` já é um projeto Expo completo:

```bash
cd app
```

```bash
npm install
```

```bash
npx expo start
```

### Onde testar

| Onde | Como |
|---|---|
| Celular na mesma rede Wi-Fi do PC | `npx expo start` e ler o QR code (Android: pelo Expo Go; iPhone: pela câmera) |
| Celular em rede diferente, ou Wi-Fi da faculdade que bloqueia conexões entre aparelhos | `npx expo start --tunnel` (na primeira vez ele instala o `@expo/ngrok`) |
| Navegador de qualquer PC | `npx expo start --web` (o Orion do professor já libera CORS) |
| Outro computador | Copie a pasta **sem** `node_modules` (GitHub, pendrive ou zip), instale o Node.js LTS e rode os três comandos acima |

Em todos os casos quem precisa alcançar a VM é o **celular** (ou o navegador), não o PC: a porta 1026 tem que estar liberada no Security Group da AWS para a rede de onde vocês estão testando.

Testado com Expo SDK 58, React Native 0.88, Reanimated 4.7 e reanimated-color-picker 5.1 (TypeScript sem erros; tela, roda de cores, botões e requisições conferidos no navegador contra um Orion simulado).

Leia o QR code com o Expo Go. Na primeira vez o app abre a tela de configurações: informe o **IP público da VM** e salve.

### Comando de voz

O reconhecimento de voz usa código nativo, que **não existe no Expo Go**. No Expo Go o app funciona inteiro, mas o botão de microfone fica apagado. Para ter a voz, gere uma *development build*:

- **Android com cabo USB e Android Studio instalado:** `npx expo run:android`
- **Sem Android Studio:** `npx eas-cli build -p android --profile development` gera um APK na nuvem (conta Expo gratuita).
- **iPhone:** `npx expo run:ios` em um Mac, ou EAS com conta de desenvolvedor Apple.

Segure o botão, fale e solte. Frases que funcionam: "azul", "deixa vermelho", "luz verde", "azul claro", "rosa", "laranja", "roxo", "branco", "liga", "desliga", "apaga". O vocabulário fica em `src/colors.ts`. No Android, o reconhecimento precisa do app Google instalado.

## 5. Problemas comuns

| Sintoma | Causa provável |
|---|---|
| "Tempo esgotado" no app | Porta 1026 fechada no Security Group da AWS, IP errado, ou VM desligada (o IP público muda quando a VM reinicia, a não ser que você use um Elastic IP) |
| `color_status` fica `PENDING` | O ESP32 não está conectado ao broker ou ainda está com o firmware antigo |
| Orion responde 422/400 em `color` | O device não foi reprovisionado com o comando `color` (passo 2) |
| Cores trocadas | `COMMON_ANODE` errado ou pinos R/G/B trocados |
| App funciona no Expo Go mas não no APK final | Faltou o plugin `expo-build-properties` com `usesCleartextTraffic` (o Orion usa HTTP sem TLS) |

> **Segurança:** o Orion não tem autenticação. Qualquer pessoa que saiba o IP pode trocar a cor da lâmpada. Para o projeto basta liberar a porta 1026 só para os IPs que vocês usam (veja `docs/07-security.md` do repositório do professor).
