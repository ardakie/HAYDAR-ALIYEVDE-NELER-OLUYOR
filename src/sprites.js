// Piksel-art karakterler ve eşyalar (Canvas.pixels ile çizilir: 1 hücre = üst/alt 2 piksel).
// '.' şeffaf. Sprite'lar sağa bakar; flip ile sola çevrilir.

const HEAD = [
  '....HHHHHH....',
  '...HHHHHHHH...',
  '..HHHHHHHHHH..',
  '..HHSSSSSSHH..',
  '..HSSSSSSSSS..',
];

const STUDENT_PAL = {
  H: 94, h: 52, S: 223, s: 180, E: 16, W: 255, M: 131, T: 33, t: 25, P: 60, p: 238, F: 160, D: 117, R: 196,
};

const LEGS_STAND = ['...PPPPPP.....', '...PPPPPPP....', '...PP...PP....', '...PP...PP....', '..FFF..FFFF...'];
const LEGS_WALK = ['...PPPPPP.....', '..PPP..PPP....', '..PP....PP....', '.PP......PP...', 'FFF......FFF..'];

const STUDENT = {
  cook: [
    ...HEAD,
    '..HSSEWSSEWS..',
    '..sSSSSSSSSS..',
    '...SSSSMMSS...',
    '....SSSSSS....',
    '.....sSSs.....',
    '...TTTTTTTT...',
    '..TTTTTTTTTTSS',
    '..TTTTTTTT...W',
    '..TTTTTTTT...W',
    '..tTTTTTTt....',
    ...LEGS_STAND,
  ],
  walk: [
    ...HEAD,
    '..HSSEWSSEWS..',
    '..sSSSSSSSSS..',
    '...SSSSSSSS...',
    '....SSSSSS....',
    '.....sSSs.....',
    '...TTTTTTTT...',
    '..TTTTTTTTTT..',
    '..TTTTTTTTTT..',
    '..STTTTTTTTS..',
    '..tTTTTTTTTt..',
    ...LEGS_WALK,
  ],
  panic: [
    '.S..HHHHHH..S.',
    '.S.HHHHHHHH.S.',
    '.T.HHHHHHHH.T.',
    '.T.HSSSSSSH.T.',
    '.T.SWWSSWWS.T.',
    '.T.SWESSEWS.T.',
    '.T.SSSSSSSS.T.',
    '.TT.SSRRSS.TT.',
    '..TT.SRRS.TT..',
    '...TTTTTTTT...',
    '...TTTTTTTT...',
    '...TTTTTTTT...',
    '...tTTTTTTt...',
    '...PPPPPPPP...',
    '...PPPPPPPP...',
    '...PP....PP...',
    '...PP....PP...',
    '..FFF....FFF..',
  ],
  carry: [
    '.S..........S.',
    '.T..HHHHHH..T.',
    '.T.HHHHHHHH.T.',
    '.T.HHHHHHHH.T.',
    '.T.HSSSSSSH.T.',
    '.T.SSSSSSSS.T.',
    '.T.SEESSEES.T.',
    '.TT.SSMMSS.TT.',
    '..TT.SSSS.TT..',
    '...TTTTTTTT...',
    '...TTTTTTTT...',
    '...TTTTTTTT...',
    '...tTTTTTTt...',
    ...LEGS_WALK,
  ],
  sit: [
    ...HEAD,
    '..HSSEWSSEWS..',
    '..sSSSSSSSSS..',
    '...SSMSSMSS...',
    '....SMMMMS....',
    '.....sSSs.....',
    '...TTTTTTTT...',
    '..TTTTTTTTTT..',
    '..TTTTTTTTTT..',
    '..STTTTTTTTS..',
    '..tTTTTTTTTt..',
    '...PPPPPPPPPP.',
    '...PPPPPPPPPP.',
    '..........PP..',
    '..........PP..',
    '.........FFF..',
  ],
  phew: [
    '....HHHHHH..D.',
    '...HHHHHHHH.D.',
    '..HHHHHHHHHH..',
    '..HHSSSSSSHHD.',
    '..HSSSSSSSSSD.',
    '..HSSEESSEES..',
    '..sSSSSSSSSS..',
    '...SSMSSMSS...',
    '....SMMMMS....',
    '.....sSSs.....',
    '...TTTTTTTTSS.',
    '..TTTTTTTTT.S.',
    '..TTTTTTTTTT..',
    '..STTTTTTTTS..',
    '..tTTTTTTTTt..',
    '...PPPPPPPPPP.',
    '...PPPPPPPPPP.',
    '..........PP..',
    '..........PP..',
    '.........FFF..',
  ],
};

// feetRow: ayakların bulunduğu terminal satırı (alt piksel)
export function drawStudent(cv, x, feetRow, pose = 'cook', step = 0, flip = false) {
  let art = STUDENT[pose] || STUDENT.walk;
  if (pose === 'walk' && step % 2) art = [...art.slice(0, -5), ...LEGS_STAND];
  if (pose === 'carry' && step % 2) art = [...art.slice(0, -5), ...LEGS_STAND];
  cv.pixels(x, (feetRow + 1) * 2 - art.length, art, STUDENT_PAL, flip);
}

const GUARD_PAL = { K: 17, k: 232, G: 220, B: 233, S: 223, s: 180, E: 16, W: 255, M: 131, N: 18, n: 17, L: 248, Y: 229 };

const GUARD_TOP = [
  '....KKKKKK....',
  '...KKKKKKKK...',
  '..KKKKGGKKKK..',
  '..BBBBBBBBBBBB',
  '....SSSSSS....',
  '....SEWSEW....',
  '....SSSSSS....',
  '....SMMMMS....',
  '.....sSSs.....',
  '...NNNNNNNN...',
  '..NNNNNNNNNN..',
];
const GUARD_ARM_LIGHT = ['..NNGNNNNNSSLL', '..NNNNNNNNN.LL', '..NNNNNNNNN...'];
const GUARD_ARM_DOWN = ['..NNGNNNNNNN..', '..NNNNNNNNNN..', '..SNNNNNNNNS..'];
const GUARD_SNIFF = ['..NNGNNNNNNN..', '..NNNNNNNNNN..', '..SNNNNNNNNS..'];
const GUARD_BELT = ['..BBBBBGBBBB..', '..nNNNNNNNNn..'];
const GUARD_LEGS = [
  ['...NNN..NNN...', '...NNN..NNN...', '...NNN..NNN...', '...NNN..NNN...', '..kkkk..kkkk..'],
  ['...NNN..NNN...', '..NNN....NNN..', '..NNN....NNN..', '.NNN......NNN.', 'kkkk......kkkk'],
];

export function drawGuard(cv, x, feetRow, { step = 0, flip = false, light = true, pose = 'walk' } = {}) {
  const arms = pose === 'sniff' ? GUARD_SNIFF : light ? GUARD_ARM_LIGHT : GUARD_ARM_DOWN;
  const legs = pose === 'stand' || pose === 'sniff' ? GUARD_LEGS[0] : GUARD_LEGS[step % 2];
  const art = [...GUARD_TOP, ...arms, ...GUARD_BELT, ...legs];
  const top = (feetRow + 1) * 2 - art.length;
  cv.pixels(x, top, art, GUARD_PAL, flip);
  if (light && pose !== 'sniff') {
    // el feneri ışık konisi
    const row = Math.floor((top + 11) / 2);
    for (let i = 0; i < 12; i++) {
      const spread = Math.floor(i / 4);
      for (let d = -spread; d <= spread; d++) {
        const cx = flip ? x - 1 - i : x + 14 + i;
        const c = cv.cell(cx, row + d);
        if (c) {
          c.ch = i < 4 ? '▒' : '░';
          c.fg = 229;
        }
      }
    }
  }
}

// ---------- Eşyalar ----------

export const ITEMS = {
  pot: {
    art: [
      '...GGGGGG...',
      '..GGGLLGGG..',
      'HHGGGGGGGGHH',
      '.gggggggggg.',
      '.gggggggggg.',
      '..gggggggg..',
    ],
    pal: { G: 250, L: 238, H: 240, g: 245 },
  },
  stove: {
    art: ['DDDDDDDDDDDD', 'DRRRRRRRRRRD', 'DDDDDDDDDDDD', '.K........K.'],
    pal: { D: 236, R: 196, K: 232 },
  },
  stoveOff: {
    art: ['DDDDDDDDDDDD', 'DrrrrrrrrrrD', 'DDDDDDDDDDDD', '.K........K.'],
    pal: { D: 236, r: 240, K: 232 },
  },
  toaster: {
    art: ['.rrrrrrrr..', 'rrrrrrrrrrW', 'rRRRRRRRRr.', 'rrrrrrrrrr.', '.k......k..'],
    pal: { r: 160, R: 124, W: 250, k: 232 },
  },
  cat: {
    art: ['K...K.......', 'KKKKK......K', 'KYKYK.....K.', 'KKKKKKKKKKK.', '.KKKKKKKKKK.', '.K.K...K.K..'],
    pal: { K: 236, Y: 226 },
  },
  catJump: {
    art: ['K...K.....K.', 'KKKKK....K..', 'KYKYKKKKK...', 'KKKKKKKKK...', 'K.K....K.K..', '...........'],
    pal: { K: 236, Y: 226 },
  },
};

export function drawItem(cv, name, x, pyTop, flip = false) {
  const it = ITEMS[name];
  cv.pixels(x, pyTop, it.art, it.pal, flip);
}

// ---------- Büyük yazı (5x7 piksel font, 2x büyütülmüş) ----------

const FONT = {
  Y: ['X...X', 'X...X', '.X.X.', '..X..', '..X..', '..X..', '..X..'],
  U: ['X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', '.XXX.'],
  R: ['XXXX.', 'X...X', 'X...X', 'XXXX.', 'X.X..', 'X..X.', 'X...X'],
  T: ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', '..X..'],
  A: ['.XXX.', 'X...X', 'X...X', 'XXXXX', 'X...X', 'X...X', 'X...X'],
  L: ['X....', 'X....', 'X....', 'X....', 'X....', 'X....', 'XXXXX'],
  M: ['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X', 'X...X', 'X...X'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

// Ortalanmış büyük yazı; colors: her piksel satırı için renk (gradyan)
export function bigText(cv, text, pyTop, colors) {
  const scale = 2;
  const width = text.length * (5 * scale + 2) - 2;
  const x0 = Math.floor((cv.w - width) / 2);
  [...text].forEach((ch, i) => {
    const g = FONT[ch] || FONT[' '];
    g.forEach((row, gy) => {
      [...row].forEach((p, gx) => {
        if (p !== 'X') return;
        for (let sx = 0; sx < scale; sx++) {
          for (let sy = 0; sy < scale; sy++) {
            const py = pyTop + gy * scale + sy;
            cv.pixel(x0 + i * (5 * scale + 2) + gx * scale + sx, py, colors[(gy * scale + sy) % colors.length]);
          }
        }
      });
    });
  });
}
