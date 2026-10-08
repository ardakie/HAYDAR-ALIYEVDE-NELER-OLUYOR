// Terminal arayüzü: üstte döngülü animasyon, altta durum paneli.
// Pencere küçükse, --sade verildiyse ya da terminal değilse düz yazı moduna düşer.
import { FPS, HEIGHT, W, frame } from './animation.js';

const PANEL = 5;
const NEED_COLS = W;
const NEED_ROWS = HEIGHT + PANEL;

const E = '\x1b[';
const B = `${E}1m`;
const DIM = `${E}2m`;
const R = `${E}0m`;
const GREEN = `${E}32m`;
const RED = `${E}31m`;
const REDBG = `${E}1;97;41m`;

const visible = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const clip = (s, n) => {
  // ANSI kodlarını koruyarak görünür uzunluğu n'de kes
  let out = '';
  let len = 0;
  for (const part of s.split(/(\x1b\[[0-9;]*m)/)) {
    if (part.startsWith('\x1b[')) out += part;
    else {
      const take = [...part].slice(0, Math.max(0, n - len)).join('');
      out += take;
      len += [...take].length;
    }
  }
  return out;
};
const time = () => new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

export function createUI({ animate = true } = {}) {
  const state = { demo: false, block: '?', enabled: true, connected: false, groups: 0, alarmText: null, alarmUntil: 0 };
  const logs = [];
  let timer = null;
  let i = 0;
  let paused = false;
  let fullscreen = false;
  const tty = process.stdout.isTTY;

  const fits = () => (process.stdout.columns || 0) >= NEED_COLS && (process.stdout.rows || 0) >= NEED_ROWS;

  function tryResize() {
    if (!tty || fits()) return;
    // Mac Terminal / iTerm / xterm pencereyi büyütebilir; Windows cmd için "mode con"
    process.stdout.write(`${E}8;${NEED_ROWS + 1};${NEED_COLS + 2}t`);
  }

  function statusLine() {
    if (state.demo) return ` ${B}YURT ALARM${R}  │  ${B}${state.block} blok${R}  │  animasyon modu ${DIM}(WhatsApp'a bağlanmaz)${R}  │  çıkmak için bir tuşa bas`;
    const alarm = state.enabled ? `${GREEN}${B}AÇIK${R}` : `${RED}${B}KAPALI${R}`;
    const wa = state.connected ? `${GREEN}bağlı${R}` : `${DIM}bağlanıyor...${R}`;
    return ` ${B}YURT ALARM${R}  │  ${B}${state.block} blok${R}  │  alarm ${alarm}  │  WhatsApp ${wa}  │  ${state.groups} grup izleniyor`;
  }
  const KEYS = ` ${DIM}[A] alarm aç/kapat   [S] sustur   [D] deneme   [G] gruplar   [Q] çıkış${R}`;

  function panel() {
    const lines = [];
    if (state.demo) return [statusLine(), '', '', '', ''].map((l) => `${clip(l, (process.stdout.columns || W) - 1)}${E}K`);
    if (state.alarmText && Date.now() < state.alarmUntil) {
      const on = i % 2 === 0;
      lines.push(on ? `${REDBG} !!! ALARM !!! ${state.alarmText} ${R}` : `${RED}${B} !!! ALARM !!! ${state.alarmText}${R}`);
    } else lines.push(statusLine());
    lines.push(KEYS);
    const last = logs.slice(-(PANEL - 2));
    while (last.length < PANEL - 2) last.unshift('');
    lines.push(...last.map((l) => (l ? ` ${l}` : '')));
    return lines.map((l) => `${clip(l, (process.stdout.columns || W) - 1)}${E}K`);
  }

  let prev = [];
  function draw() {
    if (!fullscreen || paused) return;
    const lines = [...frame(i++, state.block === '?' ? 'A' : state.block), ...panel()];
    // sadece değişen satırları yaz (terminal ve işlemci yükü düşük kalsın)
    let out = '';
    lines.forEach((l, row) => {
      if (prev[row] !== l) out += `${E}${row + 1};1H${l}${E}K`;
    });
    prev = lines;
    if (out) process.stdout.write(out);
  }

  function enter() {
    if (fullscreen) return;
    fullscreen = true;
    prev = [];
    process.stdout.write(`${E}?1049h${E}?25l${E}2J`);
    timer = setInterval(draw, Math.round(1000 / FPS));
    draw();
  }

  function leave() {
    if (!fullscreen) return;
    fullscreen = false;
    clearInterval(timer);
    timer = null;
    process.stdout.write(`${E}?25h${E}?1049l`);
  }

  function update() {
    if (!animate || !tty || paused) return;
    if (fits()) enter();
    else if (fullscreen) {
      leave();
      console.log(`${DIM}(Animasyon için pencereyi en az ${NEED_COLS}x${NEED_ROWS} yap.)${R}`);
    }
  }

  if (tty) {
    process.stdout.on('resize', () => {
      prev = [];
      if (fullscreen) process.stdout.write(`${E}2J`);
      update();
    });
  }

  return {
    get fullscreen() {
      return fullscreen;
    },
    start() {
      if (!animate || !tty) return;
      tryResize();
      // pencere büyütme isteği birkaç ms sürebilir
      setTimeout(() => {
        update();
        if (!fullscreen) console.log(`${DIM}İpucu: Pencereyi ${NEED_COLS}x${NEED_ROWS} boyutuna büyütürsen animasyon açılır.${R}`);
      }, 250);
    },
    stop() {
      leave();
    },
    // QR kodu gibi normal ekranda görünmesi gereken şeyler için
    pause() {
      paused = true;
      leave();
    },
    resume() {
      paused = false;
      update();
    },
    set(partial) {
      const changed = Object.entries(partial).some(([k, v]) => state[k] !== v);
      Object.assign(state, partial);
      if (changed && !fullscreen) console.log(statusLine());
    },
    log(msg) {
      const line = `${DIM}${time()}${R}  ${msg}`;
      if (fullscreen) {
        for (const l of String(msg).split('\n')) logs.push(`${DIM}${time()}${R}  ${l}`);
        logs.splice(0, Math.max(0, logs.length - 50));
      } else console.log(line);
    },
    alarm(text) {
      state.alarmText = visible(text).replace(/\s+/g, ' ');
      state.alarmUntil = Date.now() + 2 * 60 * 1000;
      this.log(`${RED}${B}ALARM${R} ${state.alarmText}`);
    },
    clearAlarm() {
      state.alarmUntil = 0;
    },
    keysHelp() {
      if (!fullscreen) console.log(KEYS);
    },
  };
}
