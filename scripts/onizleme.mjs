// Animasyonu tarayıcıda oynatan HTML üretir: node scripts/onizleme.mjs [çıktı.html] [blok]
import { writeFileSync } from 'node:fs';
import { FPS, FRAMES, frame } from '../src/animation.js';
import { lineToHtml } from './ansi-html.js';

const out = process.argv[2] || 'onizleme.html';
const block = process.argv[3] || 'A';
const frames = Array.from({ length: FRAMES }, (_, i) => frame(i, block).map(lineToHtml).join('\n'));
const html = `<!doctype html><meta charset="utf-8"><title>Yurt Alarm animasyon</title>
<style>body{background:#0b0b0b;margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui;color:#888}
pre{font:15px/1.12 Menlo,Consolas,monospace;margin:0;letter-spacing:0} #i{font-size:12px;margin-top:8px}</style>
<div><pre id="s"></pre><div id="i"></div></div>
<script>const F=${JSON.stringify(frames)};let i=+(location.hash.slice(1)||0);const s=document.getElementById('s'),n=document.getElementById('i');
function d(){s.innerHTML=F[i%F.length];n.textContent='kare '+(i%F.length+1)+' / '+F.length+'  (boşluk: durdur, ←/→: kare)'}
let p=!!location.hash;d();setInterval(()=>{if(!p){i++;d()}},${Math.round(1000 / FPS)});
addEventListener('keydown',e=>{if(e.key===' ')p=!p;if(e.key==='ArrowRight'){p=true;i++;d()}if(e.key==='ArrowLeft'){p=true;i=(i-1+F.length)%F.length;d()}})</script>`;
writeFileSync(out, html);
console.log(out, FRAMES, 'kare', (html.length / 1e6).toFixed(1), 'MB');
