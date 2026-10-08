// Renkli terminal tuvali: her hücrede karakter + ön plan + arka plan (256 renk).
export class Canvas {
  constructor(w, h, bg = 16) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ ch: ' ', fg: 15, bg })));
  }

  cell(x, y) {
    return y >= 0 && y < this.h && x >= 0 && x < this.w ? this.cells[y][x] : null;
  }

  // Metin çiz. Boşluklar şeffaf (opaque değilse). bg verilmezse alttaki arka plan korunur.
  put(x, y, text, fg, bg, opaque = false) {
    String(text).split('\n').forEach((line, dy) => {
      [...line].forEach((ch, dx) => {
        const c = this.cell(x + dx, y + dy);
        if (!c || (ch === ' ' && !opaque)) return;
        c.ch = ch;
        if (fg !== undefined && fg !== null) c.fg = fg;
        if (bg !== undefined && bg !== null) c.bg = bg;
      });
    });
  }

  fill(x, y, w, h, ch, fg, bg) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const c = this.cell(xx, yy);
        if (!c) continue;
        if (ch !== null) c.ch = ch;
        if (fg !== null && fg !== undefined) c.fg = fg;
        if (bg !== null && bg !== undefined) c.bg = bg;
      }
    }
  }

  // Sadece arka planı boya (ışık / renk vurgusu için)
  tint(x, y, w, h, bg) {
    this.fill(x, y, w, h, null, null, bg);
  }

  // Çok renkli sprite: satırlar + aynı boyutta renk maskesi (maskede ' ' = şeffaf, harf = palet anahtarı)
  sprite(x, y, rows, mask, palette) {
    rows.forEach((line, dy) => {
      [...line].forEach((ch, dx) => {
        const key = (mask[dy] || '')[dx] || ' ';
        if (key === ' ') return;
        const c = this.cell(x + dx, y + dy);
        if (!c) return;
        const p = palette[key] || {};
        c.ch = ch;
        if (p.fg !== undefined) c.fg = p.fg;
        if (p.bg !== undefined) c.bg = p.bg;
      });
    });
  }

  // Piksel-art: her terminal hücresi üst/alt iki pikseldir (▀ ile). art: satır dizisi, her harf palet rengi, '.' şeffaf.
  // y yarım-hücre (piksel) cinsindendir.
  pixels(x, y, art, palette, flip = false) {
    art.forEach((row, py) => {
      const chars = flip ? [...row].reverse() : [...row];
      chars.forEach((key, px) => {
        if (key === '.' || key === ' ') return;
        const color = palette[key];
        if (color === undefined) return;
        this.pixel(x + px, y + py, color);
      });
    });
  }

  pixel(x, py, color) {
    const c = this.cell(x, Math.floor(py / 2));
    if (!c) return;
    let top;
    let bottom;
    if (c.ch === '▀') [top, bottom] = [c.fg, c.bg];
    else if (c.ch === '▄') [top, bottom] = [c.bg, c.fg];
    else if (c.ch === '█') top = bottom = c.fg;
    else top = bottom = c.bg;
    if (py % 2 === 0) top = color;
    else bottom = color;
    if (top === bottom) {
      c.ch = ' ';
      c.bg = top;
    } else {
      c.ch = '▀';
      c.fg = top;
      c.bg = bottom;
    }
  }

  lines() {
    return this.cells.map((row) => {
      let out = '';
      let fg = -1;
      let bg = -1;
      for (const c of row) {
        if (c.fg !== fg || c.bg !== bg) {
          out += `\x1b[38;5;${c.fg};48;5;${c.bg}m`;
          fg = c.fg;
          bg = c.bg;
        }
        out += c.ch;
      }
      return `${out}\x1b[0m`;
    });
  }
}

export const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
