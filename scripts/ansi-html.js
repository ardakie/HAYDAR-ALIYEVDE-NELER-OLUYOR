// ANSI (256 renk) satırlarını HTML'e çevirir: animasyonu tarayıcıda önizlemek için.
const BASE = ['#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
  '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff'];
export function xterm(n) {
  if (n < 16) return BASE[n];
  if (n < 232) {
    const i = n - 16;
    const v = (c) => (c === 0 ? 0 : 55 + c * 40);
    const [r, g, b] = [Math.floor(i / 36), Math.floor(i / 6) % 6, i % 6].map(v);
    return `rgb(${r},${g},${b})`;
  }
  const g = 8 + (n - 232) * 10;
  return `rgb(${g},${g},${g})`;
}
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function lineToHtml(line) {
  let out = '';
  let fg = 15;
  let bg = 0;
  const re = /\x1b\[([0-9;]*)m|([^\x1b]+)/g;
  let m;
  while ((m = re.exec(line))) {
    if (m[1] !== undefined) {
      const p = m[1].split(';').map(Number);
      for (let i = 0; i < p.length; i++) {
        if (p[i] === 0) { fg = 15; bg = 0; }
        else if (p[i] === 38 && p[i + 1] === 5) { fg = p[i + 2]; i += 2; }
        else if (p[i] === 48 && p[i + 1] === 5) { bg = p[i + 2]; i += 2; }
      }
    } else {
      out += `<span style="color:${xterm(fg)};background:${xterm(bg)}">${esc(m[2])}</span>`;
    }
  }
  return out;
}
