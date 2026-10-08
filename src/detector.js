// Mesaj metninin kullanıcının bloğunu ilgilendiren önemli bir uyarı olup olmadığına karar verir.
// Saf modül: WhatsApp'a, dosyaya ya da sese dokunmaz; test.js ile test edilir.

export const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// Türkçe büyük/küçük harf + aksan sadeleştirme: "A BLOĞA GİRDİ" -> "a bloga girdi"
export function normalize(text) {
  return String(text || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[ıîì]/g, 'i')
    .replace(/[şș]/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/[üûù]/g, 'u')
    .replace(/[öô]/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[âà]/g, 'a')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const any = (list) => new RegExp(`\\b(?:${list.join('|')})`, 'g');

// Bunlardan biri tek başına bile "olay var" demek (3 puan)
const HARD = any([
  'guvenlik\\w*', 'baskin\\w*', 'basildi\\w*', 'bastilar', 'basiyorlar', 'basiyolar',
  'arama\\w*', 'aranma\\w*', 'aranacak\\w*', 'aranirken', 'aramaya',
  'ariyorlar', 'ariyolar', 'aradilar', 'arastir\\w*', 'ust arama\\w*',
  'kontrol\\w*', 'denetim\\w*', 'denetle\\w*', 'teftis\\w*', 'tefis\\w*',
  'polis\\w*', 'jandarma\\w*', 'cevik', 'asayis\\w*', 'sivil\\w*', 'narkotik\\w*',
  'kopekli\\w*', 'ihbar\\w*', 'tutanak\\w*',
]);

// Görevli/personel tek başına yetmez (1 puan), hareketle birleşince yeter
const SOFT = any([
  'gorevli\\w*', 'personel\\w*', 'yonetim\\w*', 'yonetici\\w*', 'egitici\\w*',
  'belletmen\\w*', 'bekci\\w*', 'idare\\w*', 'kyk', 'adamlar\\w*', 'ekip\\w*',
  'herifler\\w*', 'mudur\\w*', 'mudir\\w*', 'sayim\\w*', 'yoklama\\w*',
]);

// Hareket fiilleri (1'er puan)
const MOVE = any([
  'geldi\\w*', 'geliyor\\w*', 'geliyo\\w*', 'gelecek\\w*', 'gelcek\\w*', 'gelmis\\w*',
  'girdi\\w*', 'giriyor\\w*', 'giriyo\\w*', 'girecek\\w*', 'girmis\\w*',
  'cikti\\w*', 'cikiyor\\w*', 'cikiyo\\w*', 'cikacak\\w*', 'cikmis\\w*',
  'indi\\w*', 'iniyor\\w*', 'iniyo\\w*', 'inecek\\w*', 'inmis\\w*',
  'gecti\\w*', 'geciyor\\w*', 'geciyo\\w*',
  'dolas\\w*', 'geziyor\\w*', 'geziyo\\w*', 'geziniyor\\w*',
  'bakiyor\\w*', 'bakiyo\\w*', 'baktilar', 'topluyor\\w*', 'topladi\\w*',
  'aliyorlar', 'aliyolar', 'aldilar', 'yapiyorlar', 'yapiyolar', 'yaptilar',
  'basladi\\w*', 'basliyor\\w*', 'oda oda', 'kat kat', 'odalara gir\\w*',
]);

// Uyarı kelimeleri (2'şer puan)
const WARN = any([
  'dikkat\\w*', 'acil\\w*', 'kacin\\w*', 'saklayin', 'toplayin', 'kaldirin', 'gizleyin',
  'uyarin', 'haber verin', 'yayin', 'yayalim', 'kapilari kilitle\\w*', 'isiklari kapat\\w*',
]);

const FLOOR_WORD = '(?:\\d{1,2}|zemin|giris|bodrum|birinci|ikinci|ucuncu|dorduncu|besinci|altinci|yedinci|sekizinci|dokuzuncu|onuncu|son|en ust|ust|alt|cati)';
const FLOOR = new RegExp(`\\b${FLOOR_WORD} ?(?:kat\\w*|katlar\\w*)|\\bkat\\w* (?:kat|\\d)|\\b\\d{1,2} ?(?:e|a|ye|ya|te|ta|de|da|ten|tan|den|dan|inci|nci|uncu|ncu)\\b`, 'g');
// "kattalar", "kataymis", "bloktalar" gibi "orada bulunuyorlar" anlamındaki ekler
const THERE_PLURAL = /\b(?:kat\w*?(?:talar|dalar|alar|ayiz|ayken|taymis|daymis)|blo[kg]\w*?(?:talar|dalar|alar|aymis|taymis))\w*/;
// "geliyorlar", "çıkıyolar", "geldiler", "çıktılar": 3. çoğul kişi hareket
const PLURAL_VERB = /\b\w+(?:iyor|uyor|iyo|uyo)lar\w*\b|\b\w+(?:diler|tiler|dular|tular|duler|tuler|dilar|tilar)\b/;

// Olay bitti / gittiler -> sadece sessiz bilgi bildirimi
const CLEAR = /\b(?:gittiler|gitti|gitmisler|ayrildi\w*|bitti|bitmis|bitti artik|tamamlandi\w*|temiz|temizmis|rahat|rahatiz|sakinlesti|kimse yok|yok artik|arama yok|guvenlik yok|kontrol yok|cikip gittiler|cikti gitti)\b|blo[kg]\w*(?:tan|dan) cikti\w*|yurttan cikti\w*/;

// Çamaşırhane vs. gündelik konular (-2)
const NOISE = any([
  'camasir\\w*', 'makine\\w*', 'kurutma\\w*', 'kurutucu\\w*', 'deterjan\\w*', 'yumusatici\\w*',
  'utu\\w*', 'mutfak\\w*', 'ocak\\w*', 'buzdolab\\w*', 'etut\\w*', 'kantin\\w*', 'market\\w*',
  'yemek\\w*', 'kahvalti\\w*', 'sicak su', 'su yok', 'sular\\w*', 'elektrik\\w*', 'internet\\w*',
  'wifi\\w*', 'asansor\\w*', 'kargo\\w*', 'paket\\w*', 'kayip\\w*', 'satilik\\w*', 'satiyorum',
  'dus\\w*', 'tuvalet\\w*', 'lavabo\\w*', 'temizlik\\w*', 'cop\\w*', 'anahtar\\w*', 'priz\\w*',
  'su\\b', 'parti\\w*', 'dogum gunu\\w*', 'mac\\b', 'maca\\b', 'film\\w*', 'ders\\w*', 'sinav\\w*',
]);

const LETTER = '[a-h]';
const SEP = '(?: ?(?:ve|ile|veya|ya da|,)? ?)';
// "a blok", "ablok", "a bloğa", "a ve b blok", "a b c bloklar", "a binası", "a kanadı", "a blk"
const BLOCK_REF = new RegExp(
  `\\b(${LETTER}(?:${SEP}${LETTER})*) ?(?:blo[kg]\\w*|blk\\w*|bina\\w*|kanad\\w*|kanat\\w*)`,
  'g',
);
// "A'ya geldiler", "A'da arama" -> sadece güçlü kelimeyle birlikte sayılır
const BLOCK_SUFFIX = new RegExp(`\\b(${LETTER}) (?:ya|ye|da|de|ta|te|dan|den|tan|ten|daki|deki|nin|nin)\\b`, 'g');
const WHOLE_DORM = /\b(?:tum|butun|her|hepsi|tum yurt\w*)(?: (?:blok\w*|blog\w*|yurt\w*|yurd\w*|kat\w*|oda\w*))|\byur[dt]\w*\b|\bhaydar aliyev\w*/;

function count(re, s) {
  re.lastIndex = 0;
  return (s.match(re) || []).length;
}

// Metinde geçen blok harflerini döndürür: { letters:Set, suffixLetters:Set, whole:boolean }
export function findBlocks(norm) {
  const letters = new Set();
  for (const m of norm.matchAll(BLOCK_REF)) {
    for (const l of m[1].match(/[a-h]/g)) letters.add(l.toUpperCase());
  }
  const suffixLetters = new Set();
  for (const m of norm.matchAll(BLOCK_SUFFIX)) suffixLetters.add(m[1].toUpperCase());
  return { letters, suffixLetters, whole: WHOLE_DORM.test(norm) };
}

export function score(norm) {
  const hard = count(HARD, norm) > 0;
  const soft = count(SOFT, norm) > 0;
  const move = Math.min(count(MOVE, norm), 2);
  const warn = count(WARN, norm) > 0;
  const floor = count(FLOOR, norm) > 0;
  const therePlural = THERE_PLURAL.test(norm);
  const plural = PLURAL_VERB.test(norm);
  const noise = count(NOISE, norm) > 0;

  let s = 0;
  if (hard) s += 3;
  if (soft) s += 1;
  s += move;
  if (warn) s += 2;
  if (plural) s += 1;
  if (therePlural) s += 3; // "a bloktalar", "3. kattalar"
  else if (floor && plural) s += 3; // "5. kata çıktılar"
  else if (floor) s += 1;
  if ((hard || soft) && (move || plural || warn)) s += 1;
  if (noise) s -= 2;
  return { score: s, hard, noise, clear: CLEAR.test(norm) };
}

const ALERT_AT = 3;
const FOLLOWUP_AT = 2;
export const CONTEXT_MS = 20 * 60 * 1000;

// Mesajı değerlendirir.
// opts: { block:'A', groupName:'...', now:Date.now(), context: { block, until } }
// Dönen: { level: 'alarm'|'info'|null, reason, context }
export function evaluate(text, opts) {
  const block = opts.block.toUpperCase();
  const now = opts.now ?? Date.now();
  const norm = normalize(text);
  if (!norm) return { level: null, reason: 'bos', context: opts.context };

  const { letters, suffixLetters, whole } = findBlocks(norm);
  const sc = score(norm);
  const groupBlocks = findBlocks(normalize(opts.groupName || '')).letters;

  const mentionsMine = letters.has(block) || (suffixLetters.has(block) && sc.hard);
  const mentionsOther = [...letters, ...(sc.hard ? suffixLetters : [])].some((l) => l !== block);
  const groupIsMine = groupBlocks.size === 1 && groupBlocks.has(block);
  const groupIsOther = groupBlocks.size > 0 && !groupBlocks.has(block);

  const prevCtx = opts.context && opts.context.until > now ? opts.context : null;
  let ctx = prevCtx;

  // Bu mesaj hangi blok hakkında?
  let about = null;
  if (mentionsMine) about = 'mine';
  else if (mentionsOther) about = 'other';
  else if (groupIsMine) about = 'mine';
  else if (groupIsOther) about = 'other';
  else if (whole && sc.hard) about = 'whole';
  else if (prevCtx) about = prevCtx.block === block ? 'mine-ctx' : 'other';

  const threshold = about === 'mine-ctx' ? FOLLOWUP_AT : ALERT_AT;

  // Konu takibi: olay mesajı geldiyse 20 dk boyunca o bloğu "gündem" say
  if (sc.score >= ALERT_AT && (letters.size || suffixLetters.size)) {
    const topic = letters.has(block) || suffixLetters.has(block) ? block : [...letters, ...suffixLetters][0];
    ctx = { block: topic, until: now + CONTEXT_MS };
  } else if (about === 'mine' && sc.score >= ALERT_AT) {
    ctx = { block, until: now + CONTEXT_MS };
  }

  if (about === 'other' || about === null) return { level: null, reason: about || 'blok-yok', context: ctx };

  // "gittiler / bitti / A bloktan çıktılar" -> sessiz bilgi (olay sürerken ya da güçlü kelimeyle)
  if (sc.clear && sc.score < ALERT_AT + 3 && (prevCtx?.block === block || sc.hard)) {
    return { level: 'info', reason: 'bitti', context: null };
  }

  if (sc.score >= threshold) {
    return { level: 'alarm', reason: about, score: sc.score, context: ctx };
  }
  return { level: null, reason: `dusuk-puan(${sc.score})`, context: ctx };
}

// Grup / topluluk / kanal adı izlenecekler arasında mı?
export function nameMatches(name, keywords) {
  const n = normalize(name).replace(/ /g, '');
  return keywords.some((k) => {
    const kn = normalize(k).replace(/ /g, '');
    return kn && n.includes(kn);
  });
}
