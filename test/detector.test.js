import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, nameMatches, normalize } from '../src/detector.js';

const GENEL = 'Haydar Aliyev Yurdu Duyuru';
const run = (text, block = 'A', extra = {}) => evaluate(text, { block, groupName: GENEL, now: 1_000_000, ...extra });
const level = (...a) => run(...a).level;

const ALARM_A = [
  'A blok baskın',
  'A BLOĞA GÜVENLİK GİRDİ',
  'a bloğa güvenlik girdi!!!',
  'A blok 1. kata geldiler',
  'A blok 5. 2. 3. 4. kattalar',
  'A blokta arama var',
  'A blokta arama yapıyorlar dikkat',
  'A blokta kontrol var',
  'ablokta oda kontrolü başladı',
  'A-blok oda oda geziyorlar',
  'A bloğa polis geldi',
  'A blokta jandarma var',
  'A bloktalar',
  'A bloktalarmış',
  'A blok dikkat geliyorlar',
  'A blok 3. kata çıktılar',
  'A blok 2. kattan aşağı indiler',
  'a blok zemin kattalar',
  "A'ya güvenlik geldi",
  "A'da arama başladı",
  'A ve B blokta arama var',
  'B, A bloklara baskın',
  'Tüm bloklarda arama var',
  'Yurda baskın var',
  'yurtta arama başlamış dikkat',
  'A binasına güvenlik girdi',
  'A blokta görevliler odalara giriyor',
  'A blokta müdür ile görevliler geziyorlar',
  'A blok güvenlik geliyooo',
  'A BLOK ACİL GÜVENLİK',
  'A blokta sivil polis var',
  'A blokta üst arama yapıyorlar',
  'a blok 4e çıktılar',
];

const SESSIZ_A = [
  'A blok çamaşırhanede makine boş mu',
  'A blok çamaşırhaneye geldiler mi',
  'A blok 1. kat çamaşırhane bozuk',
  'A blok çamaşırhanenin anahtarı güvenlikte',
  'A blokta kurutma makinesi çalışmıyor',
  'A blok 3. katta boş oda var mı',
  'A blok 4. katta parti var geliyor musunuz',
  'A blok 2. katta su geldi',
  'A blokta sıcak su yok',
  'A blok asansör bozuk',
  'A blok kargo geldi',
  'A blokta kim var maça gelecek',
  'B blokta arama var',
  'B bloğa güvenlik girdi',
  'C blok 2. kattalar',
  'D blokta polis var',
  'A blok',
  'merhaba arkadaşlar',
  'yurt müdürü ile görüştüm yarın burs açıklanacak',
  'yurtta yemek ne',
  'A blokta yoklama',
  '5. kattalar',
  'güvenlik geldi',
  'a bak ne güzel',
];

for (const msg of ALARM_A) {
  test(`ALARM (A): ${msg}`, () => {
    const r = run(msg);
    assert.equal(r.level, 'alarm', JSON.stringify(r));
  });
}

for (const msg of SESSIZ_A) {
  test(`sessiz (A): ${msg}`, () => {
    const r = run(msg);
    assert.notEqual(r.level, 'alarm', JSON.stringify(r));
  });
}

test('B bloğu seçen kişi A baskınında alarm almaz, B baskınında alır', () => {
  assert.equal(level('A bloğa güvenlik girdi', 'B'), null);
  assert.equal(level('B bloğa güvenlik girdi', 'B'), 'alarm');
  assert.equal(level('b blok 3. kattalar', 'B'), 'alarm');
  assert.equal(level('A ve B blokta arama var', 'B'), 'alarm');
});

test('C ve D blokları da çalışır', () => {
  assert.equal(level('C bloğa güvenlik girdi', 'C'), 'alarm');
  assert.equal(level('D blokta arama var', 'D'), 'alarm');
  assert.equal(level('D blokta arama var', 'C'), null);
});

test('olay sürerken blok adı geçmeyen devam mesajları alarm verir', () => {
  const first = run('A bloğa güvenlik girdi');
  assert.equal(first.level, 'alarm');
  const ctx = first.context;
  assert.equal(ctx.block, 'A');
  for (const msg of ['3. kattalar', 'şimdi 4e çıktılar', 'geliyorlar', 'dikkat', '5. kata çıkıyorlar']) {
    assert.equal(run(msg, 'A', { context: ctx, now: 1_000_000 + 60_000 }).level, 'alarm', msg);
  }
  // 20 dakika sonra bağlam düşer
  assert.equal(run('3. kattalar', 'A', { context: ctx, now: 1_000_000 + 21 * 60_000 }).level, null);
});

test('başka blokta olay sürerken devam mesajları alarm vermez', () => {
  const first = run('B bloğa güvenlik girdi');
  assert.equal(first.level, null);
  assert.equal(first.context.block, 'B');
  assert.equal(run('3. kattalar', 'A', { context: first.context, now: 1_000_100 }).level, null);
});

test('olay bitince sessiz bilgi bildirimi', () => {
  const ctx = run('A bloğa güvenlik girdi').context;
  assert.equal(run('gittiler', 'A', { context: ctx, now: 1_000_100 }).level, 'info');
  assert.equal(run('A bloktan çıktılar', 'A', { context: ctx, now: 1_000_100 }).level, 'info');
  assert.equal(run('A blokta güvenlik gitti').level, 'info');
  assert.equal(run('A blok rahat').level, null);
});

test('A bloğa özel grupta blok adı yazmadan da alarm', () => {
  const g = { groupName: 'Haydar Aliyev A Blok' };
  assert.equal(run('5. kattalar', 'A', g).level, 'alarm');
  assert.equal(run('güvenlik girdi', 'A', g).level, 'alarm');
  assert.equal(run('çamaşırhane boş', 'A', g).level, null);
  assert.equal(run('5. kattalar', 'B', g).level, null);
});

test('grup adı eşleşmesi', () => {
  const k = ['Haydar Aliyev'];
  assert.ok(nameMatches('HAYDAR ALİYEV YURDU', k));
  assert.ok(nameMatches('haydaraliyev a blok', k));
  assert.ok(nameMatches('🏢 Haydar Aliyev KYK Erkek', k));
  assert.ok(!nameMatches('Ekonomi 2. sınıf', k));
});

test('normalize Türkçe karakterleri sadeleştirir', () => {
  assert.equal(normalize("A BLOĞA GİRDİ, Işık!"), 'a bloga girdi isik');
});
