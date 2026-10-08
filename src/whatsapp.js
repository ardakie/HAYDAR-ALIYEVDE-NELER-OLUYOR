// WhatsApp'a "bağlı cihaz" olarak bağlanır ve SADECE gelen grup/kanal mesajlarını okur.
// Hiçbir mesaj, okundu bilgisi ya da "çevrimiçi" durumu göndermez.
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidGroup,
  isJidNewsletter,
  normalizeMessageContent,
  useMultiFileAuthState,
} from 'baileys';
import QRCode from 'qrcode';
import { AUTH_DIR, QR_FILE, clearSession } from './config.js';
import { nameMatches } from './detector.js';

const noop = () => {};
const silentLogger = { level: 'silent', trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };
silentLogger.child = () => silentLogger;

// Bu uygulama yazmaz: gönderme ile ilgili tüm fonksiyonları kilitler
const SEND_FUNCTIONS = [
  'sendMessage', 'relayMessage', 'sendPresenceUpdate', 'presenceSubscribe', 'readMessages',
  'sendReceipts', 'chatModify', 'star', 'groupLeave', 'groupCreate', 'groupParticipantsUpdate',
  'groupUpdateSubject', 'groupUpdateDescription', 'updateProfileStatus', 'updateProfileName',
  'updateProfilePicture', 'updateBlockStatus', 'rejectCall', 'newsletterFollow', 'newsletterUnfollow',
  'newsletterReactMessage', 'sendPeerDataOperationMessage', 'requestPlaceholderResend', 'fetchMessageHistory',
];

function lockSending(sock) {
  for (const fn of SEND_FUNCTIONS) {
    if (typeof sock[fn] === 'function') {
      sock[fn] = () => {
        throw new Error(`Yurt Alarm mesaj göndermez (${fn} engellendi)`);
      };
    }
  }
}

export function textOf(message) {
  let m = normalizeMessageContent(message);
  if (m?.protocolMessage?.editedMessage) m = normalizeMessageContent(m.protocolMessage.editedMessage);
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.pollCreationMessage?.name ||
    m.pollCreationMessageV2?.name ||
    m.pollCreationMessageV3?.name ||
    ''
  );
}

// events: onStatus(text), onQr(qrString), onPairingCode(code), onReady(watchedNames[]), onMessage({ text, chat, sender, timestamp })
export async function startWhatsApp({ keywords, pairingNumber, events }) {
  let stopped = false;
  let retry = 0;
  let sock = null;
  const chats = new Map(); // jid -> Promise<{ name, watched }>

  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {}

  const chatInfo = (jid, meta) => {
    if (meta) {
      chats.set(jid, Promise.resolve(describeGroup(meta)));
    } else if (!chats.has(jid)) {
      chats.set(jid, loadChat(jid).catch(() => ({ name: jid, watched: false })));
      // hata olursa bir dakika sonra tekrar denensin
      chats.get(jid).then((c) => c.name === jid && setTimeout(() => chats.delete(jid), 60_000));
    }
    return chats.get(jid);
  };

  const groupNames = new Map(); // grup/topluluk jid -> ad
  const describeGroup = (meta) => {
    groupNames.set(meta.id, meta.subject || '');
    const parentName = meta.linkedParent ? groupNames.get(meta.linkedParent) || '' : '';
    const name = meta.subject || meta.id;
    const watched = nameMatches(name, keywords) || (parentName && nameMatches(parentName, keywords));
    return { name: parentName && !nameMatches(name, keywords) ? `${parentName} › ${name}` : name, watched: !!watched };
  };

  async function loadChat(jid) {
    if (isJidNewsletter(jid)) {
      const meta = await sock.newsletterMetadata('jid', jid);
      const name = meta?.name || meta?.thread_metadata?.name?.text || jid;
      return { name, watched: nameMatches(name, keywords) };
    }
    const meta = await sock.groupMetadata(jid);
    if (meta.linkedParent && !groupNames.has(meta.linkedParent)) {
      try {
        const parent = await sock.groupMetadata(meta.linkedParent);
        groupNames.set(parent.id, parent.subject || '');
      } catch {}
    }
    return describeGroup(meta);
  }

  async function loadAllGroups() {
    const all = await sock.groupFetchAllParticipating();
    const metas = Object.values(all);
    for (const m of metas) groupNames.set(m.id, m.subject || '');
    const watched = [];
    for (const m of metas) {
      const info = await chatInfo(m.id, m);
      if (info.watched) watched.push(info.name);
    }
    return watched.sort((a, b) => a.localeCompare(b, 'tr'));
  }

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let pairingRequested = false;

    sock = makeWASocket({
      auth: state,
      version,
      logger: silentLogger,
      browser: Browsers.appropriate('Chrome'),
      markOnlineOnConnect: false, // telefonuna bildirimler gelmeye devam etsin
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false, // eski mesajları indirme (RAM/disk tasarrufu)
      generateHighQualityLinkPreview: false,
      emitOwnEvents: false,
      getMessage: async () => undefined,
    });
    lockSending(sock);
    const current = sock;

    current.ev.on('creds.update', saveCreds);

    current.ev.on('connection.update', async (u) => {
      if (current !== sock) return;
      if (u.qr) {
        if (pairingNumber) {
          if (!pairingRequested) {
            pairingRequested = true;
            try {
              const code = await current.requestPairingCode(pairingNumber.replace(/\D/g, ''));
              events.onPairingCode?.(code);
            } catch (e) {
              events.onStatus?.(`Eşleştirme kodu alınamadı: ${e.message}`);
            }
          }
        } else {
          const terminalQr = await QRCode.toString(u.qr, { type: 'terminal', small: true });
          QRCode.toFile(QR_FILE, u.qr, { width: 480, margin: 2 }).catch(() => {});
          events.onQr?.(terminalQr);
        }
      }
      if (u.connection === 'open') {
        retry = 0;
        events.onStatus?.('WhatsApp bağlandı ✓');
        try {
          events.onReady?.(await loadAllGroups());
        } catch (e) {
          events.onStatus?.(`Grup listesi alınamadı (${e.message}), mesaj geldikçe tanınacak.`);
          events.onReady?.(null);
        }
      }
      if (u.connection === 'close') {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        if (stopped) return;
        if (code === DisconnectReason.loggedOut) {
          clearSession();
          events.onStatus?.('WhatsApp bu cihazın bağlantısını kaldırdı. Yeniden bağlanmak için kodu tekrar okut.');
          chats.clear();
          setTimeout(connect, 1000);
          return;
        }
        if (code === DisconnectReason.connectionReplaced) {
          events.onStatus?.('Bu oturum başka bir yerde açıldı. Bu pencere kapatılıyor.');
          stopped = true;
          events.onFatal?.();
          return;
        }
        const wait = code === DisconnectReason.restartRequired ? 500 : Math.min(60_000, 2000 * 2 ** retry++);
        events.onStatus?.(`Bağlantı koptu, ${Math.round(wait / 1000)} sn sonra tekrar bağlanılıyor...`);
        setTimeout(connect, wait);
      }
    });

    current.ev.on('groups.upsert', (metas) => metas.forEach((m) => chatInfo(m.id, m)));
    current.ev.on('groups.update', (updates) => {
      for (const u of updates) if (u.id && u.subject) chats.delete(u.id);
    });

    current.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        const jid = msg.key?.remoteJid;
        if (!jid || msg.key.fromMe) continue;
        if (!isJidGroup(jid) && !isJidNewsletter(jid)) continue; // özel mesajlara bakılmaz
        const text = textOf(msg.message);
        if (!text) continue;
        const chat = await chatInfo(jid);
        if (!chat.watched) continue;
        events.onMessage?.({
          text,
          chat: chat.name,
          sender: msg.pushName || '',
          timestamp: Number(msg.messageTimestamp || 0) * 1000 || Date.now(),
        });
      }
    });
  }

  await connect();
  return {
    stop() {
      stopped = true;
      try {
        sock?.end(undefined);
      } catch {}
    },
    async refreshGroups() {
      chats.clear();
      return loadAllGroups();
    },
  };
}
