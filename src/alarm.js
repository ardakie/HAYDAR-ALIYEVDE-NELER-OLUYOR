// Bilgisayarda alarm: terminalde kırmızı uyarı + işletim sistemi bildirimi + siren + "Sustur" penceresi.
// Mac: osascript/afplay/say, Windows: PowerShell (MessageBox + Alarm01.wav + konuşma), Linux: notify-send/paplay.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const SIREN_MAX_MS = 2 * 60 * 1000;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

let siren = null; // { procs: [], timers: [], stop() }

const RED = '\x1b[41m\x1b[97m\x1b[1m';
const YELLOW = '\x1b[43m\x1b[30m\x1b[1m';
const RESET = '\x1b[0m';

function run(cmd, args, opts = {}) {
  try {
    const p = spawn(cmd, args, { stdio: 'ignore', windowsHide: true, ...opts });
    p.on('error', () => {});
    return p;
  } catch {
    return null;
  }
}

function osa(script) {
  return run('osascript', ['-e', script]);
}

const q = (s) => `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function powershell(script, env = {}) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encoded], {
    env: { ...process.env, ...env },
  });
}

function terminalBanner(level, title, body) {
  const color = level === 'alarm' ? RED : YELLOW;
  const line = ' '.repeat(Math.max(10, Math.min(process.stdout.columns || 60, 72)));
  const pad = (s) => ` ${s}`.padEnd(line.length).slice(0, line.length);
  process.stdout.write(`\n${color}${line}\n${pad(title)}\n${line}${RESET}\n${body}\n\n`);
  if (level === 'alarm') process.stdout.write('\x07\x07\x07');
}

export function sirenActive() {
  return siren !== null;
}

export function stopSiren() {
  if (!siren) return false;
  const s = siren;
  siren = null;
  s.timers.forEach(clearInterval);
  s.timers.forEach(clearTimeout);
  for (const p of s.procs) {
    try {
      p.kill();
    } catch {}
  }
  return true;
}

function notify(title, body) {
  if (isMac) {
    osa(`display notification ${q(body.slice(0, 200))} with title ${q(title)} sound name "Sosumi"`);
  } else if (isWin) {
    powershell(
      `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing;
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::Warning
$n.Visible = $true
$n.ShowBalloonTip(15000, $env:YA_TITLE, $env:YA_BODY, 'Warning')
Start-Sleep -Seconds 15
$n.Dispose()`,
      { YA_TITLE: title, YA_BODY: body.slice(0, 200) },
    );
  } else {
    run('notify-send', ['-u', 'critical', title, body.slice(0, 200)]);
  }
}

function startSiren(title, body, speech) {
  stopSiren();
  const s = { procs: [], timers: [] };
  siren = s;
  const track = (p) => {
    if (!p) return;
    s.procs.push(p);
    p.on('exit', () => {
      const i = s.procs.indexOf(p);
      if (i >= 0) s.procs.splice(i, 1);
    });
  };

  if (isMac) {
    const play = () => {
      if (siren !== s) return;
      track(run('afplay', ['-v', '2', '/System/Library/Sounds/Sosumi.aiff']));
      track(run('afplay', ['-v', '2', '/System/Library/Sounds/Funk.aiff']));
    };
    play();
    s.timers.push(setInterval(play, 900));
    const voice = hasYelda() ? ['-v', 'Yelda'] : [];
    const talk = () => siren === s && track(run('say', [...voice, speech]));
    talk();
    s.timers.push(setInterval(talk, 12000));
    // Ekranda kalan kritik pencere: "Sustur"a basınca siren durur
    const dialog = osa(
      `display alert ${q(title)} message ${q(body)} as critical buttons {"Sustur"} default button 1 giving up after ${SIREN_MAX_MS / 1000}`,
    );
    if (dialog) {
      track(dialog);
      dialog.on('exit', () => siren === s && stopSiren());
    }
  } else if (isWin) {
    const ps = powershell(
      `$ErrorActionPreference = 'SilentlyContinue'
Add-Type -AssemblyName System.Windows.Forms
$wav = Join-Path $env:WINDIR 'Media\\Alarm01.wav'
$player = $null
if (Test-Path $wav) { $player = New-Object System.Media.SoundPlayer $wav; $player.PlayLooping() }
else { Start-Job { while ($true) { [console]::Beep(1200, 300); [console]::Beep(800, 300) } } | Out-Null }
try { Add-Type -AssemblyName System.Speech; $tts = New-Object System.Speech.Synthesis.SpeechSynthesizer; $tts.Volume = 100; $tts.SpeakAsync($env:YA_SPEECH) | Out-Null } catch {}
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
[System.Windows.Forms.MessageBox]::Show($owner, $env:YA_BODY, $env:YA_TITLE, 'OK', 'Warning') | Out-Null
if ($player) { $player.Stop() }
Get-Job | Stop-Job`,
      { YA_TITLE: title, YA_BODY: `${body}\n\nSusturmak için Tamam'a basın.`, YA_SPEECH: speech },
    );
    if (ps) {
      track(ps);
      ps.on('exit', () => siren === s && stopSiren());
    }
  } else {
    const snd = '/usr/share/sounds/freedesktop/stereo/alarm-clock-elapsed.oga';
    const play = () => siren === s && track(run('paplay', [snd]));
    play();
    s.timers.push(setInterval(play, 1500));
    const z = run('zenity', ['--warning', `--title=${title}`, `--text=${body}`]);
    if (z) {
      track(z);
      z.on('exit', () => siren === s && stopSiren());
    }
  }

  s.timers.push(setTimeout(() => siren === s && stopSiren(), SIREN_MAX_MS));
}

let yelda;
function hasYelda() {
  if (yelda === undefined) {
    try {
      yelda = /Yelda/.test(spawnSync('say', ['-v', '?'], { encoding: 'utf8' }).stdout || '');
    } catch {
      yelda = false;
    }
  }
  return yelda;
}

function softSound() {
  if (isMac) run('afplay', ['/System/Library/Sounds/Glass.aiff']);
  else if (isWin) powershell(`(New-Object System.Media.SoundPlayer (Join-Path $env:WINDIR 'Media\\Windows Notify System Generic.wav')).PlaySync()`);
  else if (existsSync('/usr/share/sounds/freedesktop/stereo/message.oga')) run('paplay', ['/usr/share/sounds/freedesktop/stereo/message.oga']);
}

// level: 'alarm' -> siren + pencere + bildirim, 'info' -> sessiz bildirim
export function fire({ level, title, body, speech, sound = true, terminal = true }) {
  if (terminal) terminalBanner(level, title, body);
  if (!sound) return;
  if (level === 'alarm') {
    notify(title, body);
    if (!siren) startSiren(title, body, speech || title);
  } else {
    notify(title, body);
    softSound();
  }
}

// Mac'te ekran uyusa da bilgisayarın uykuya geçip alarmı kaçırmasını engeller (program açık kaldıkça)
export function preventSleep() {
  if (isMac) run('caffeinate', ['-i', '-w', String(process.pid)]);
}
