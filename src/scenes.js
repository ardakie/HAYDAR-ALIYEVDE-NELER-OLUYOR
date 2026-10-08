// Detaylı sahneler ve karakterler. Yalnızca CP437'de de bulunan karakterler kullanılır (Windows cmd uyumu).
import { drawItem } from './sprites.js';

export const W = 100;
export const H = 27; // + 1 satır altyazı

// ---------- Karakterler ----------

// Güvenlik görevlisi (7x5). step: yürüme adımı, light: el feneri yönü (1 sağ, -1 sol, 0 yok)
export function miniGuard(cv, x, y, step = 0, dir = 1) {
  const legs = step % 2 ? [' █   █ ', ' ▀   ▀ '] : ['  █ █  ', '  ▀ ▀  '];
  cv.sprite(x, y, ['  ▄▄▄  ', ' (•_•) ', ' ▐█▓█▌ ', legs[0], legs[1]], [
    '  ccc  ',
    ' fffff ',
    ' bbybb ',
    legs[0].replace(/[^ ]/g, 'p'),
    legs[1].replace(/[^ ]/g, 'k'),
  ], {
    c: { fg: 17 }, f: { fg: 223 }, b: { fg: 18 }, y: { fg: 220 }, p: { fg: 18 }, k: { fg: 232 },
  });
  // el feneri ışığı
  if (dir) {
    const bx = dir > 0 ? x + 7 : x - 6;
    cv.put(bx, y + 2, dir > 0 ? '═▒▒░░░' : '░░░▒▒═', 228);
  }
}

// ---------- Sahne: yurt dışarıdan ----------

const BX = 16;
const BW = 68;
const ROOF = 5;
const GROUND = 23;
const WIN_X = (k) => BX + 3 + k * 7;
const FLOOR_Y = [21, 18, 15, 12, 9]; // zemin, 1, 2, 3, 4. kat
const LIT = new Set(['1-0', '1-4', '2-6', '3-2', '3-7', '4-1', '4-5', '2-1', '1-8', '4-8', '0-1', '0-7']);
export const ROOM_WIN = { floor: 3, k: 2 }; // 312

function sky(cv, f) {
  for (let y = 0; y < GROUND; y++) cv.fill(0, y, W, 1, ' ', 15, y < 9 ? 17 : 18);
  const stars = [[3, 1], [11, 3], [24, 0], [37, 2], [52, 1], [60, 3], [71, 0], [79, 2], [95, 4], [7, 6], [92, 7], [46, 0], [66, 4], [2, 9], [97, 10]];
  stars.forEach(([x, y], i) => cv.put(x, y, ['*', '+', '.', '·'][(f + i * 3) % 8 < 4 ? i % 2 : 2 + (i % 2)], (f + i) % 5 ? 229 : 255));
  // ay
  cv.put(87, 1, ' ▄██▄\n██▓███\n▀████▀', 230);
  cv.put(89, 2, '▓', 187);
}

function flag(cv, f) {
  cv.put(BX + 2, 0, '│\n│\n│\n│\n│', 250);
  const wave = f % 4 < 2;
  cv.fill(BX + 3, 0, 6, 2, ' ', 15, 160);
  cv.put(BX + 4, 0, '(*', 231, 160);
  if (wave) cv.put(BX + 9, 1, '▀', 160);
  else cv.put(BX + 9, 0, '▄', 160);
}

function building(cv, f, block, opts) {
  // çatı + tabela
  cv.put(BX - 1, ROOF, '▄'.repeat(BW + 2), 240);
  cv.fill(BX, ROOF + 1, BW, 2, ' ', 231, 24);
  const l1 = 'T.C. GENÇLİK VE SPOR BAKANLIĞI • KREDİ VE YURTLAR KURUMU';
  const l2 = `HAYDAR ALİYEV ÖĞRENCİ YURDU  ─  ${block} BLOK`;
  cv.put(BX + Math.floor((BW - l1.length) / 2), ROOF + 1, l1, 153, 24);
  cv.put(BX + Math.floor((BW - l2.length) / 2), ROOF + 2, l2, 231, 24);
  cv.put(BX + Math.floor((BW - l2.length) / 2) + l2.length - 6, ROOF + 2, `${block} BLOK`, 220, 24);

  // cephe (tuğla dokusu)
  for (let y = ROOF + 3; y < GROUND; y++) {
    for (let x = BX; x < BX + BW; x++) {
      const brick = (y % 2 === 0 ? x % 6 === 0 : x % 6 === 3);
      cv.fill(x, y, 1, 1, brick ? '▌' : ' ', 95, 137);
    }
  }
  // kenar sütunları
  cv.fill(BX, ROOF + 3, 1, GROUND - ROOF - 3, '█', 95, 137);
  cv.fill(BX + BW - 1, ROOF + 3, 1, GROUND - ROOF - 3, '█', 95, 137);

  // pencereler
  FLOOR_Y.forEach((y, floor) => {
    for (let k = 0; k < 9; k++) {
      const x = WIN_X(k);
      if (floor === 0 && k >= 3 && k <= 5) continue; // giriş
      const isRoom = floor === ROOM_WIN.floor && k === ROOM_WIN.k;
      let lit = LIT.has(`${floor}-${k}`);
      if (!isRoom && (f + k * 7 + floor * 3) % 61 === 0) lit = !lit; // arada ışık yanıp sönsün
      let glass = lit ? 222 : 236;
      if (isRoom) glass = opts.roomAlarm ? (f % 2 ? 196 : 222) : f % 6 < 5 ? 222 : 228;
      cv.fill(x, y, 5, 2, ' ', 15, glass);
      cv.put(x + 2, y, '│\n│', lit || isRoom ? 137 : 240, glass);
      if (lit || isRoom) cv.put(x, y, '▐\n▐', 167, glass); // perde
      cv.put(x, y + 2, '▀▀▀▀▀', 250, 137); // denizlik
    }
  });

  // 312'den çıkan duman
  if (opts.smoke) {
    const sx = WIN_X(ROOM_WIN.k);
    const sy = FLOOR_Y[ROOM_WIN.floor];
    for (let i = 0; i < 4; i++) {
      const yy = sy - 1 - i - (f % 2);
      const xx = sx + 2 + ((f + i) % 3) - 1;
      if (yy > ROOF + 2) cv.put(xx, yy, i < 2 ? '▒' : '░', 250);
    }
  }

  // giriş
  const ex = WIN_X(3) - 1;
  cv.put(ex - 1, 19, '▄'.repeat(23), 245);
  cv.fill(ex + 3, 20, 15, 1, ' ', 231, 238);
  cv.put(ex + 8, 20, 'GİRİŞ', 231, 238);
  cv.fill(ex + 1, 21, 19, 2, ' ', 15, opts.doorOpen ? 16 : 30);
  if (!opts.doorOpen) cv.put(ex + 1, 21, '║    ║    ║    ║   ║\n║    ║    ║    ║   ║'.slice(0, 41), 152, 30);
  else cv.put(ex + 1, 21, '░                 ░\n░                 ░', 30, 16);
}

function tree(cv, x, y, f) {
  const sway = f % 8 < 4 ? 0 : 1;
  cv.put(x + sway, y, '   ▄▓▓▄\n ▄▓▓▒▓▓▓▄\n▐▓▒▓▓▓▒▓▓▌\n ▀▓▓▓▒▓▓▀', 28);
  cv.put(x + 1 + sway, y + 1, '  ▒   ▒', 34);
  cv.put(x + 4, y + 4, '██\n██\n██', 94);
}

function lamp(cv, x, f) {
  cv.put(x - 1, 13, '▄█▄', 250);
  cv.put(x, 14, '▼', f % 30 === 0 ? 240 : 228);
  cv.fill(x, 15, 1, GROUND - 15, '│', 245);
  // ışık halkası
  cv.tint(x - 3, GROUND, 7, 1, 101);
}

function booth(cv, x, y) {
  cv.put(x, y, '▄▄▄▄▄▄▄▄▄▄▄', 250);
  cv.fill(x, y + 1, 11, 4, ' ', 15, 24);
  cv.put(x + 1, y + 1, 'GÜVENLİK', 231, 24);
  cv.fill(x + 2, y + 2, 7, 2, ' ', 15, 222);
  cv.put(x + 5, y + 2, '│\n│', 137, 222);
}

function street(cv, f) {
  cv.fill(0, GROUND, W, 1, '▀', 250, 244);
  cv.fill(0, GROUND + 1, W, 3, ' ', 15, 236);
  for (let x = (f * 2) % 8; x < W; x += 8) cv.put(x, GROUND + 2, '▬▬▬', 228, 236);
}

export function exterior(cv, f, block, opts = {}) {
  sky(cv, f);
  flag(cv, f);
  building(cv, f, block, opts);
  street(cv, f);
  tree(cv, 1, 14, f);
  lamp(cv, 13, f);
  lamp(cv, 87, f + 9);
  booth(cv, 88, 18);
  if (opts.guards) {
    opts.guards.forEach((gx, i) => miniGuard(cv, gx, 19, f + i, 1));
    const lead = Math.max(...opts.guards);
    cv.put(lead - 1, 17, 'GÜVENLİK', 231, 18);
  }
}

// ---------- Sahne: oda 312 ----------

export const R_FLOOR = 22;
export const ROOM = { door: 3, bunk: 17, desk: 39, table: 66, window: 81 };

export function room(cv, f, block, s) {
  const red = s.alarm && f % 2 === 0;
  const wall = red ? 174 : 187;
  cv.fill(0, 0, W, R_FLOOR, ' ', 15, wall);
  cv.fill(0, 0, W, 1, '▀', 180, wall); // tavan pervazı
  for (let x = 2; x < W; x += 11) cv.put(x, 1 + (x % 3), '·', red ? 167 : 180, wall); // duvar dokusu
  // tavan lambası
  cv.put(30, 1, '│\n│', 240, wall);
  cv.put(29, 3, '▄█▄', 240, wall);
  cv.put(30, 4, '▼', 230, wall);

  // parke zemin
  for (let y = R_FLOOR; y < H; y++) {
    for (let x = 0; x < W; x++) cv.fill(x, y, 1, 1, (x + y * 5) % 11 === 0 ? '│' : '▬', 130, 94);
  }
  cv.fill(0, R_FLOOR, W, 1, '▀', 137, 94); // süpürgelik
  // halı
  cv.fill(40, R_FLOOR + 1, 24, 3, '░', 131, 88);

  // kapı
  const dx = ROOM.door;
  cv.fill(dx - 1, 7, 14, 1, '▄', 130, wall); // kasa
  if (s.doorOpen) {
    cv.fill(dx, 8, 12, 14, ' ', 15, 235);
    cv.put(dx + 1, 9, 'koridor', 238, 235);
    cv.fill(dx + 12, 8, 1, 14, '▌', 94, wall);
  } else {
    cv.fill(dx, 8, 12, 14, ' ', 15, 94);
    cv.put(dx + 1, 9, '┌────────┐\n│        │\n│        │\n│        │\n└────────┘', 130, 94);
    cv.put(dx + 1, 15, '┌────────┐\n│        │\n│        │\n│        │\n│        │\n└────────┘', 130, 94);
    cv.put(dx + 10, 15, '●', 220, 94);
    cv.put(dx + 4, 10, '312', 16, 250);
    if (s.knock) cv.put(dx + 1, 5, f % 4 < 2 ? 'TAK! TAK! TAK!' : '  TAK!  TAK!  ', 160, wall);
  }

  // ranza
  const bx = ROOM.bunk;
  cv.fill(bx, 5, 1, 17, '█', 240, wall);
  cv.fill(bx + 19, 5, 1, 17, '█', 240, wall);
  cv.put(bx + 20, 6, '╪\n╪\n╪\n╪\n╪\n╪\n╪\n╪\n╪', 245, wall); // merdiven
  for (const y of [11, 19]) {
    cv.fill(bx + 1, y, 18, 1, '▀', 240, 238); // karyola
    cv.fill(bx + 1, y - 1, 18, 1, ' ', 15, 255); // çarşaf
    cv.fill(bx + 7, y - 2, 12, 2, ' ', 15, y === 11 ? 25 : 88); // battaniye
    cv.put(bx + 7, y - 2, '░░░░░░░░░░░░', y === 11 ? 31 : 124, y === 11 ? 25 : 88);
    cv.fill(bx + 2, y - 2, 4, 1, ' ', 15, 255); // yastık
  }

  // raf + kitaplar, saat
  cv.put(41, 2, '┌─────┐\n│01:30│\n└─────┘', 238, 255);
  cv.put(50, 4, '▐█▌█▐█▌█', 88, wall);
  cv.put(51, 4, '█', 25, wall);
  cv.put(53, 4, '█', 28, wall);
  cv.put(56, 4, '█', 136, wall);
  cv.fill(49, 5, 12, 1, '▀', 94, wall);

  // masa + laptop
  const mx = ROOM.desk;
  cv.fill(mx, 17, 22, 1, '▄', 94, wall);
  cv.fill(mx, 18, 22, 1, '▀', 94, 52);
  cv.fill(mx + 1, 19, 1, 3, '█', 52, wall);
  cv.fill(mx + 20, 19, 1, 3, '█', 52, wall);
  const lx = mx + 3;
  cv.fill(lx, 7, 17, 9, ' ', 15, 236);
  const sx = lx + 1;
  const sw = 15;
  if (s.screen === 'alarm') {
    const on = f % 2 === 0;
    const bg = on ? 196 : 52;
    cv.fill(sx, 8, sw, 7, ' ', 15, bg);
    cv.put(sx + 2, 8, '!! ALARM !!', on ? 231 : 196, bg);
    cv.put(sx + 1, 10, `${block} BLOĞA`, 231, bg);
    cv.put(sx + 1, 11, 'GÜVENLİK', 231, bg);
    cv.put(sx + 1, 12, 'GİRDİ!!!', 231, bg);
    cv.put(sx + 2, 14, 'YURT ALARM', on ? 220 : 196, bg);
    cv.tint(lx - 2, 6, 21, 1, on ? 203 : wall); // kırmızı parlama
  } else if (s.screen === 'clear') {
    cv.fill(sx, 8, sw, 7, ' ', 15, 22);
    cv.put(sx + 2, 9, 'YURT ALARM', 231, 22);
    cv.put(sx + 1, 11, `${block} blok temiz`, 120, 22);
    cv.put(sx + 1, 12, 'gittiler :)', 120, 22);
  } else {
    cv.fill(sx, 8, sw, 1, ' ', 15, 29);
    cv.put(sx, 8, '< HA Yurdu   :', 231, 29);
    cv.fill(sx, 9, sw, 6, ' ', 15, 235);
    cv.put(sx + 1, 9, 'Ali: tost?', 252, 238);
    cv.put(sx + 4, 11, 'yarın sınav', 252, 22);
    cv.put(sx + 1, 13, f % 8 < 4 ? 'Ece: ...' : 'Ece: ..', 252, 238);
  }
  cv.fill(lx - 1, 16, 19, 1, '▀', 250, wall); // klavye
  cv.put(lx + 8, 15, '▄', 236, 236);
  // sandalye
  cv.put(mx + 8, 18, '▄▄▄▄▄', 238, 52);
  cv.put(mx + 8, 19, '█   █\n█   █\n▀   ▀', 238, wall);

  // yemek tezgâhı (pencerenin altında)
  const tx = ROOM.table;
  cv.fill(tx, 18, 25, 1, '▄', 137, wall);
  cv.fill(tx + 1, 19, 1, 3, '█', 95, wall);
  cv.fill(tx + 23, 19, 1, 3, '█', 95, wall);
  if (s.stove) drawItem(cv, s.cooking ? 'stove' : 'stoveOff', tx + 2, 32);
  if (s.pot) {
    drawItem(cv, 'pot', tx + 2, 26);
    if (s.cooking) {
      const st = ['°  ~  °', ' ~ ° ~ ', '~ °  ~ ', ' ° ~  °'][f % 4];
      cv.put(tx + 3, 11 - (f % 2), st, 255);
      cv.put(tx + 3, 12 - (f % 2), [...st].reverse().join(''), 252);
      if (f % 4 < 2) cv.put(tx + 14, 12, 'cız cız', 130);
    }
  }
  if (s.toaster) drawItem(cv, 'toaster', tx + 14, 31);

  // pencere
  const wx = ROOM.window;
  cv.fill(wx, 4, 15, 11, ' ', 15, 252);
  cv.fill(wx + 1, 5, 13, 9, ' ', 15, 17);
  cv.put(wx + 2, 6, '*      .', 229, 17);
  cv.put(wx + 9, 7, '▄█▄\n▀█▀', 230, 17);
  cv.put(wx + 2, 10, '.    *', 229, 17);
  cv.put(wx + 1, 12, ' ▄▓▄   ▄▓▓▄ ', 22, 17);
  cv.put(wx + 1, 13, '▀▀▀▀▀▀▀▀▀▀▀▀▀', 236, 17);
  if (!s.windowOpen) {
    cv.fill(wx + 7, 5, 1, 9, '█', 252, 17);
    cv.fill(wx + 1, 9, 13, 1, '▀', 252, 17);
  } else {
    cv.fill(wx + 1, 5, 2, 9, '▒', 252, 17); // açılmış kanat
  }
  const flap = s.windowOpen && f % 2;
  cv.fill(wx - 2, 3, 3, 13, '║', 131, 167);
  cv.fill(wx + 14 + (flap ? 1 : 0), 3, 3, 13, '║', 131, 167);
  cv.fill(wx - 3, 3, 21, 1, '▄', 240, wall);
  cv.fill(wx, 15, 15, 1, '▀', 252, wall); // denizlik
}

// ---------- Sahne: 312'nin penceresi dışarıdan (eşyalar düşüyor) ----------

export function windowOutside(cv, f) {
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < W; x++) {
      const brick = y % 2 === 0 ? x % 8 === 0 : x % 8 === 4;
      cv.fill(x, y, 1, 1, brick ? '▌' : ' ', 95, 137);
    }
    cv.put(0, y, ' ', 15, 137);
  }
  // pencereler
  const win = (x, y, lit, open) => {
    cv.fill(x - 1, y - 1, 18, 1, '▄', 250, 137);
    cv.fill(x, y, 16, 7, ' ', 15, lit ? 222 : 236);
    if (!open) cv.fill(x + 8, y, 1, 7, '│', 137, lit ? 222 : 236);
    else cv.fill(x, y, 3, 7, '▒', 250, lit ? 222 : 236);
    if (lit) cv.fill(x, y, 2, 7, '▐', 167, 222);
    cv.fill(x - 1, y + 7, 18, 1, '▀', 250, 137);
  };
  win(8, 3, false, false);
  win(42, 3, true, true);
  win(76, 3, false, false);
  cv.put(46, 1, '312', 16, 250);
  // zemin: çimen + çalılar
  cv.fill(0, 20, W, 7, ' ', 15, 22);
  for (let x = 0; x < W; x++) cv.put(x, 20, (x * 7) % 5 ? '"' : ',', 34, 22);
  cv.put(5, 18, ' ▄▓▓▄▄▓▄\n▓▓▒▓▓▓▒▓▓', 28);
  cv.put(84, 18, ' ▄▓▄▄▓▓▄\n▓▓▓▒▓▓▒▓▓', 28);
}
