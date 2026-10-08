// Ayarlar ve oturum dosyaları kullanıcının ev klasöründe durur: ~/.yurt-alarm (Windows: C:\Users\<ad>\.yurt-alarm)
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, rmSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { BLOCKS } from './detector.js';

export const DATA_DIR = process.env.YURT_ALARM_DIR || join(homedir(), '.yurt-alarm');
export const AUTH_DIR = join(DATA_DIR, 'oturum');
export const CONFIG_FILE = join(DATA_DIR, 'ayarlar.json');
export const LOG_FILE = join(DATA_DIR, 'alarmlar.log');
export const QR_FILE = join(DATA_DIR, 'qr.png');

const DEFAULTS = { block: null, keywords: ['Haydar Aliyev'] };

mkdirSync(DATA_DIR, { recursive: true });

export function loadConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(cfg) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

export function parseBlock(v) {
  const b = String(v || '').trim().toUpperCase().replace(/\s*BLOK.*$/, '');
  return BLOCKS.includes(b) ? b : null;
}

export async function askSetup(cfg, { onlyBlock = false } = {}) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    let block = null;
    while (!block) {
      block = parseBlock(await rl.question(`Hangi blokta kalıyorsun? (A / B / C / D)${cfg.block ? ` [${cfg.block}]` : ''}: `)) ||
        (cfg.block && !onlyBlock ? cfg.block : null);
      if (!block) console.log('  Lütfen sadece blok harfini yaz, örn: A');
    }
    cfg.block = block;
    if (!onlyBlock) {
      const kw = await rl.question(`Hangi grup/kanal adlarını izleyeyim? Virgülle ayır [${cfg.keywords.join(', ')}]: `);
      if (kw.trim()) cfg.keywords = kw.split(',').map((s) => s.trim()).filter(Boolean);
    }
  } finally {
    rl.close();
  }
  saveConfig(cfg);
  return cfg;
}

export function logAlert(line) {
  try {
    appendFileSync(LOG_FILE, `${new Date().toLocaleString('tr-TR')}  ${line}\n`);
  } catch {}
}

export function clearSession() {
  if (existsSync(AUTH_DIR)) rmSync(AUTH_DIR, { recursive: true, force: true });
}
