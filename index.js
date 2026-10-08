#!/usr/bin/env -S node --liftoff-only --max-semi-space-size=1 --max-old-space-size=64
// Yurt Alarm: yurt WhatsApp gruplarında kullanıcının bloğuyla ilgili önemli bir duyuru gelince masaüstü uyarısı verir.
import { existsSync } from 'node:fs';
import { evaluate } from './src/detector.js';
import { fire, preventSleep, sirenActive, stopSiren } from './src/alarm.js';
import { AUTH_DIR, DATA_DIR, LOG_FILE, QR_FILE, askSetup, clearSession, loadConfig, logAlert, parseBlock, saveConfig } from './src/config.js';
import { createUI } from './src/ui.js';

const OLD_MESSAGE_MS = 10 * 60 * 1000; // bilgisayar kapalıyken gelmiş eski mesajlar alarm çaldırmaz

const B = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const R = '\x1b[0m';

const args = process.argv.slice(2);
const has = (...names) => names.some((n) => args.includes(n));
const valueOf = (...names) => {
  const i = args.findIndex((a) => names.includes(a));
  return i >= 0 ? args[i + 1] : undefined;
};

function help() {
  console.log(`
${B}Yurt Alarm${R} — WhatsApp gruplarındaki baskın/arama mesajlarında bilgisayardan alarm verir.
Mesaj GÖNDERMEZ, sadece okur.

Kullanım:
  yurt-alarm                 Başlat (ilk seferde bloğunu sorar)
  yurt-alarm --blok B        Bloğu değiştir ve başlat
  yurt-alarm --ayarla        Blok ve izlenecek grup adlarını yeniden ayarla
  yurt-alarm --kod 905XXXXXXXXX
                             QR yerine telefon numarasıyla eşleştirme kodu al
  yurt-alarm --deneme        WhatsApp'a bağlanmadan alarmı dene
  yurt-alarm --animasyon     Sadece animasyonu oynat
  yurt-alarm --sade          Animasyonsuz, düz yazı modunda çalış
  yurt-alarm --cikis         WhatsApp oturumunu bu bilgisayardan sil

Çalışırken tuşlar:
  A  alarmı aç / kapat       S  sireni sustur
  D  deneme alarmı           G  izlenen grupları göster
  Q  çıkış

Ayarlar ve oturum: ${DATA_DIR}
`);
}

const sampleBody = (block) => `Haydar Aliyev Yurdu Duyuru • Ahmet:\n"${block} bloğa güvenlik girdi, 3. kattalar"`;

function demoAlarm(block, terminal = true) {
  fire({
    level: 'alarm',
    title: `🚨 ${block} BLOKTA ARAMA / BASKIN`,
    body: sampleBody(block),
    speech: `Dikkat! ${block} blokta arama var.`,
    terminal,
  });
}

process.on('exit', () => {
  stopSiren();
  if (process.stdout.isTTY) process.stdout.write('\x1b[?25h');
});

function onKeys(handler) {
  if (!process.stdin.isTTY) return;
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (key) => handler(key.toLowerCase()));
}

async function main() {
  if (has('--yardim', '--help', '-h')) return help();

  const cfg = loadConfig();

  if (has('--cikis')) {
    clearSession();
    console.log(`Oturum silindi. Telefonunda WhatsApp > Bağlı cihazlar'dan da kaldırabilirsin.`);
    return;
  }

  const blockArg = valueOf('--blok', '-b');
  if (blockArg) {
    const b = parseBlock(blockArg);
    if (!b) return console.log(`Geçersiz blok: ${blockArg}. Örnek: --blok A`);
    cfg.block = b;
    saveConfig(cfg);
  }

  if (has('--animasyon')) {
    const ui = createUI({ animate: true });
    ui.set({ demo: true, block: cfg.block || 'A' });
    ui.start();
    onKeys(() => {
      ui.stop();
      process.exit(0);
    });
    return;
  }

  if (!cfg.block || has('--ayarla')) await askSetup(cfg);

  if (has('--deneme')) {
    console.log(`Deneme alarmı çalıyor (${cfg.block} blok). Pencereden "Sustur"a bas ya da 2 dk bekle.`);
    demoAlarm(cfg.block);
    const end = () => {
      stopSiren();
      process.exit(0);
    };
    process.on('SIGINT', end);
    process.on('SIGTERM', end);
    return;
  }

  const ui = createUI({ animate: !has('--sade') });
  let enabled = true;
  let context = null;
  let wa = null;
  let showingQr = false;

  console.log(`\n${B}🚨 Yurt Alarm${R}  ${DIM}(mesaj göndermez, sadece okur)${R}`);
  console.log(`   ${cfg.block} blok için izleniyor • grup adı: ${cfg.keywords.join(', ')}`);
  ui.set({ block: cfg.block, enabled, connected: false, groups: 0 });
  if (existsSync(AUTH_DIR)) ui.start();

  const quit = () => {
    stopSiren();
    ui.stop();
    wa?.stop();
    console.log('\nGüle güle. Yurt Alarm kapatıldı.');
    process.exit(0);
  };
  process.on('SIGINT', quit);
  process.on('SIGTERM', quit);

  const { startWhatsApp } = await import('./src/whatsapp.js');
  preventSleep();

  wa = await startWhatsApp({
    keywords: cfg.keywords,
    pairingNumber: valueOf('--kod'),
    events: {
      onStatus: (msg) => ui.log(msg),
      onQr(qr) {
        ui.pause();
        if (!showingQr) {
          console.log(`\n${CYAN}İlk bağlantı:${R} Telefonda WhatsApp > Ayarlar > Bağlı cihazlar > Cihaz bağla`);
        }
        showingQr = true;
        console.log(`\nBu QR kodu telefonla okut (20 sn'de bir yenilenir):\n${qr}`);
        console.log(`${DIM}Okunmuyorsa resim hali: ${QR_FILE}\nYa da: yurt-alarm --kod 905XXXXXXXXX${R}\n`);
      },
      onPairingCode(code) {
        ui.pause();
        console.log(`\nTelefonda WhatsApp > Bağlı cihazlar > Cihaz bağla > "Bunun yerine telefon numarasıyla bağla" seçip bu kodu gir:\n\n    ${B}${code}${R}\n`);
      },
      onReady(list) {
        showingQr = false;
        ui.set({ connected: true, groups: list ? list.length : 0 });
        ui.resume();
        if (!ui.fullscreen) ui.start();
        if (list && !list.length) {
          ui.log(`${RED}Adında "${cfg.keywords.join('", "')}" geçen grup bulunamadı.${R} --ayarla ile değiştir.`);
        } else if (list) {
          ui.log(`İzlenen gruplar: ${list.join(' · ')}`);
        }
        ui.keysHelp();
      },
      onFatal() {
        ui.stop();
        process.exit(1);
      },
      onMessage({ text, chat, sender, timestamp }) {
        const now = Date.now();
        const r = evaluate(text, { block: cfg.block, groupName: chat, now, context });
        context = r.context;
        if (!r.level) return;
        const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text;
        const body = `${chat}${sender ? ` • ${sender}` : ''}:\n"${preview}"`;
        const oneLine = body.replace(/\n/g, ' ');
        logAlert(`[${r.level}] ${chat} | ${sender} | ${text.replace(/\s+/g, ' ')}`);
        if (now - timestamp > OLD_MESSAGE_MS) {
          ui.log(`${DIM}(eski mesaj, alarm çalınmadı) ${oneLine}${R}`);
          return;
        }
        if (r.level === 'alarm') {
          fire({
            level: 'alarm',
            title: `🚨 ${cfg.block} BLOKTA ARAMA / BASKIN`,
            body,
            speech: `Dikkat! ${cfg.block} blokta arama var.`,
            sound: enabled,
            terminal: !ui.fullscreen,
          });
          if (ui.fullscreen) ui.alarm(oneLine);
        } else {
          fire({ level: 'info', title: `✅ ${cfg.block} blok: gitmiş olabilirler`, body, sound: enabled, terminal: !ui.fullscreen });
          ui.clearAlarm();
          if (ui.fullscreen) ui.log(`Bilgi: ${oneLine}`);
        }
        if (!enabled) ui.log(`${DIM}(alarm kapalı, ses çalınmadı. Açmak için A)${R}`);
      },
    },
  });

  onKeys(async (k) => {
    if (k === '\u0003' || k === 'q') return quit();
    if (k === 'a') {
      enabled = !enabled;
      if (!enabled) {
        stopSiren();
        ui.clearAlarm();
      }
      ui.set({ enabled });
      ui.log(enabled ? 'Alarm AÇILDI.' : 'Alarm KAPATILDI. Mesajlar yine burada görünecek ama ses çalmayacak.');
    } else if (k === 's' || k === ' ') {
      const was = stopSiren();
      ui.clearAlarm();
      ui.log(was ? 'Siren susturuldu.' : 'Çalan siren yok.');
    } else if (k === 'd') {
      if (!enabled) ui.log('Alarm kapalı. Deneme için önce A ile aç.');
      else if (!sirenActive()) {
        demoAlarm(cfg.block, !ui.fullscreen);
        if (ui.fullscreen) ui.alarm(sampleBody(cfg.block));
      }
    } else if (k === 'g') {
      try {
        const list = await wa.refreshGroups();
        ui.set({ groups: list.length });
        ui.log(`İzlenen gruplar (${list.length}): ${list.join(' · ') || 'yok'}`);
      } catch {
        ui.log('Henüz bağlı değil.');
      }
    }
  });
  if (!ui.fullscreen) console.log(`${DIM}Alarm kayıtları: ${LOG_FILE}${R}`);
}

main().catch((e) => {
  if (process.stdout.isTTY) process.stdout.write('\x1b[?25h\x1b[?1049l');
  console.error(`Hata: ${e?.message || e}`);
  process.exit(1);
});
