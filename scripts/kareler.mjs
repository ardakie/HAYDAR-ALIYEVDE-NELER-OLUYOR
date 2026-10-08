// Örnek kareleri HTML olarak kaydeder: node scripts/kareler.mjs <çıktı.html>
import { writeFileSync } from 'node:fs';
import { Canvas } from '../src/canvas.js';
import { W, H, exterior, room, drawStudent, drawGuard } from '../src/scenes.js';
import { lineToHtml } from './ansi-html.js';

const shots = [];
const add = (title, draw) => { const cv = new Canvas(W, H); draw(cv); shots.push({ title, lines: cv.lines() }); };

add('1) Haydar Aliyev KYK Yurdu — güvenlik geliyor', (cv) => exterior(cv, 12, 'A', { guards: [34, 26], smoke: true }));
add('2) Oda 312 — gizli yemek', (cv) => { room(cv, 3, 'A', { screen: 'normal', stove: true, pot: true, cooking: true, toaster: true }); drawStudent(cv, 60, 17, 'cook'); });
add('3) Oda 312 — YURT ALARM (kırmızı yanıp sönüyor)', (cv) => { room(cv, 0, 'A', { alarm: true, screen: 'alarm', stove: true, pot: true, cooking: true, toaster: true }); drawStudent(cv, 60, 17, 'panic'); cv.put(61, 15, '!!', 196); });
add('4) Oda 312 — kontrol', (cv) => { room(cv, 5, 'A', { screen: 'normal', doorOpen: true }); drawStudent(cv, 49, 17, 'sit'); drawGuard(cv, 16, 17, 1, 1); drawGuard(cv, 70, 17, 0, -1); cv.put(18, 15, '??', 18); cv.put(70, 15, 'Temiz.', 18); });

const html = `<!doctype html><meta charset="utf-8"><title>Yurt Alarm animasyon önizleme</title>
<style>body{background:#111;color:#ddd;font-family:system-ui;padding:16px} pre{font:14px/1.15 Menlo,Consolas,monospace;margin:4px 0 24px;display:inline-block;letter-spacing:0} h3{margin:0;font-weight:600}</style>
${shots.map((s) => `<h3>${s.title}</h3><pre>${s.lines.map(lineToHtml).join('\n')}</pre>`).join('\n')}`;
writeFileSync(process.argv[2] || 'onizleme.html', html);
console.log('ok', shots.length);
