// Terminal animasyonu (döngü, ~31 sn): yurt binası, oda sahneleri ve kapanış yazısı.
// frame(i) saf fonksiyondur: sadece metin üretir, dosya ya da ağ kullanmaz.
import { Canvas, lerp } from './canvas.js';
import { H, R_FLOOR, ROOM, W, exterior, room, windowOutside } from './scenes.js';
import { bigText, drawGuard, drawItem, drawStudent } from './sprites.js';

export { W };
export const HEIGHT = H;
export const FPS = 8;

const SCENES = [
  ['exterior', 40],
  ['cook', 16],
  ['alarm', 24],
  ['throw', 40],
  ['fall', 24],
  ['knock', 16],
  ['inspect', 48],
  ['phew', 16],
  ['title', 24],
];
export const FRAMES = SCENES.reduce((n, [, d]) => n + d, 0);

const FEET = R_FLOOR - 1;

function bubble(cv, x, y, text, fg = 16, bg = 255) {
  const t = ` ${text} `;
  const bx = Math.max(0, Math.min(W - t.length, x));
  cv.put(bx, y, t, fg, bg, true);
  cv.put(Math.min(W - 1, Math.max(0, x + 2)), y + 1, '▼', bg);
}

const ITEM_ORDER = ['pot', 'stove', 'toaster'];
const ITEM_H = { pot: 6, stove: 4, toaster: 5 };

function scene(name, t, block, cv) {
  const desk = ROOM.desk + 6;
  switch (name) {
    case 'exterior': {
      const doorX = 44;
      const g1 = lerp(-12, doorX, t / 34);
      const g2 = lerp(-20, doorX - 7, t / 34);
      exterior(cv, t, block, { smoke: true, doorOpen: t >= 28, guards: t < 36 ? [g1, g2] : null });
      break;
    }
    case 'cook': {
      room(cv, t, block, { screen: 'normal', stove: true, pot: true, cooking: true, toaster: true });
      drawStudent(cv, 52, FEET, 'cook');
      if (t % 8 < 5) bubble(cv, 50, 9, '♪ menemen ♪');
      break;
    }
    case 'alarm': {
      room(cv, t, block, { alarm: true, screen: 'alarm', stove: true, pot: true, cooking: true, toaster: true });
      drawStudent(cv, 52, FEET, 'panic');
      if (t % 4 < 2) cv.put(56, 10, '!!!', 196);
      if (t % 2 === 0) cv.put(41, 6, '▄▄ WİU WİU ▄▄', 196);
      break;
    }
    case 'throw': {
      const grabbed = (i) => t >= 6 + i * 11;
      const thrown = (i) => t >= 12 + i * 11;
      room(cv, t, block, {
        screen: t % 4 < 2 ? 'alarm' : 'normal',
        alarm: t < 6,
        windowOpen: t >= 6,
        stove: !grabbed(1),
        pot: !grabbed(0),
        toaster: !grabbed(2),
        cooking: false,
      });
      const sx = lerp(52, 72, t / 6);
      const holding = ITEM_ORDER.findIndex((_, i) => grabbed(i) && !thrown(i));
      drawStudent(cv, sx, FEET, t < 6 ? 'walk' : holding >= 0 ? 'carry' : 'walk', t);
      if (holding >= 0) {
        const it = ITEM_ORDER[holding];
        drawItem(cv, it, sx + 1, 26 - ITEM_H[it]);
      }
      ITEM_ORDER.forEach((it, i) => {
        const ft = (t - (12 + i * 11)) / 6;
        if (ft < 0 || ft > 1) return;
        const x = lerp(78, 106, ft);
        const py = Math.round(20 - 22 * ft + 8 * ft * ft);
        drawItem(cv, it, x, py, Math.floor(t / 2) % 2 === 1);
      });
      const shout = ['HOP!', 'HOOP!', 'HOOOP!'];
      ITEM_ORDER.forEach((_, i) => {
        if (t >= 12 + i * 11 && t < 17 + i * 11) bubble(cv, sx - 2, 7, shout[i]);
      });
      break;
    }
    case 'fall': {
      windowOutside(cv, t);
      const sounds = ['KLANG!', 'TANGIRT!', 'ÇAT!'];
      const landX = [30, 52, 70];
      ITEM_ORDER.forEach((it, i) => {
        const ft = (t - i * 6) / 8;
        if (ft < 0) return;
        const x = lerp(48, landX[i], Math.min(ft, 1));
        const py = Math.round(Math.min(14 + 26 * ft * ft, 41 - ITEM_H[it]));
        drawItem(cv, it, x, py, ft < 1 && Math.floor(t / 2) % 2 === 1);
        if (ft >= 1 && ft < 1.8) cv.put(x, 17, sounds[i], 226, 137);
      });
      // kedi
      if (t < 10) drawItem(cv, 'cat', 62, 36);
      else {
        const cx = lerp(62, 104, (t - 10) / 10);
        drawItem(cv, 'catJump', cx, t < 13 ? 30 : 36);
        if (t < 16) cv.put(Math.min(cx, 88), 13, 'MİYAV!!', 231, 137);
      }
      break;
    }
    case 'knock': {
      room(cv, t, block, { screen: 'normal', knock: t >= 6 });
      drawStudent(cv, desk, FEET, 'sit');
      if (t < 6) bubble(cv, 60, 9, 'la la la ~');
      else bubble(cv, 60, 9, 'Gir...gir...girin!');
      break;
    }
    case 'inspect': {
      room(cv, t, block, { screen: 'normal', doorOpen: t < 46 });
      drawStudent(cv, desk, FEET, 'sit');
      let g1;
      let g2;
      let leaving = false;
      if (t < 12) {
        g1 = lerp(-2, 20, t / 12);
        g2 = lerp(-10, 62, t / 12);
      } else if (t < 34) {
        g1 = 20;
        g2 = 62;
      } else {
        leaving = true;
        g1 = lerp(20, -16, (t - 34) / 10);
        g2 = lerp(62, -16, (t - 34) / 12);
      }
      const sweepLeft = t >= 12 && t < 34 && Math.floor(t / 5) % 2 === 1;
      const inside = t >= 12 && t < 34;
      drawGuard(cv, g2, FEET, { step: t, flip: leaving, light: inside && !(t >= 16 && t < 28), pose: t >= 16 && t < 28 ? 'sniff' : inside ? 'stand' : 'walk' });
      drawGuard(cv, g1, FEET, { step: t + 1, flip: leaving || sweepLeft, light: inside, pose: inside ? 'stand' : 'walk' });
      if (t < 10) bubble(cv, g1, 8, 'KONTROL!');
      else if (t < 16) bubble(cv, g1 + 4, 8, '?');
      else if (t < 26) bubble(cv, g2 - 2, 9, 'Yanık kokusu mu var?');
      else if (t < 34) bubble(cv, 60, 9, 'Mum yaktım abi :)');
      else if (t < 40) bubble(cv, Math.max(2, g1), 8, 'Temiz. Hadi.');
      break;
    }
    case 'phew': {
      room(cv, t, block, { screen: 'clear' });
      drawStudent(cv, desk, FEET, 'phew');
      bubble(cv, 60, 10, t % 6 < 3 ? 'Fiuuu...' : 'Fiuuu... ;)');
      break;
    }
    case 'title': {
      cv.fill(0, 0, W, H, ' ', 15, 16);
      const on = t % 2 === 0;
      // siren ışıkları
      cv.fill(4, 2, 8, 3, ' ', 15, on ? 196 : 52);
      cv.fill(W - 12, 2, 8, 3, ' ', 15, on ? 21 : 17);
      cv.fill(4, 5, 8, 1, '▀', 240, 16);
      cv.fill(W - 12, 5, 8, 1, '▀', 240, 16);
      bigText(cv, 'YURT', 6, on ? [196, 196, 202, 202, 208, 208, 214, 214, 220, 220, 226, 226, 227, 227] : [124, 124, 160, 160, 196, 196, 202, 202, 208, 208, 214, 214, 220, 220]);
      bigText(cv, 'ALARM', 24, on ? [226, 226, 220, 220, 214, 214, 208, 208, 202, 202, 196, 196, 160, 160] : [220, 220, 214, 214, 208, 208, 202, 202, 196, 196, 160, 160, 124, 124]);
      const sub = 'Bloğuna güvenlik gelince ilk sen bil.';
      cv.put(Math.floor((W - sub.length) / 2), 22, sub, 231, 16);
      const sub2 = 'WhatsApp gruplarını okur  •  asla mesaj göndermez';
      cv.put(Math.floor((W - sub2.length) / 2), 24, sub2, 245, 16);
      break;
    }
    default:
  }
}

export function frame(i, block = 'A') {
  const cv = new Canvas(W, HEIGHT);
  let f = ((i % FRAMES) + FRAMES) % FRAMES;
  for (const [name, dur] of SCENES) {
    if (f < dur) {
      scene(name, f, block, cv);
      break;
    }
    f -= dur;
  }
  return cv.lines();
}
