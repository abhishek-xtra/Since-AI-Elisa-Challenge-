// Builds index.html from the scene list below: one Kokoro WAV per voice line (cached by text hash
// in assets/vo/), scene length = that line's audio + 0.6 s. Run: node build.mjs
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HF = 'hyperframes@0.9.19';
const VOICE = 'am_michael';
const SPEED = '1.4'; // the script's voiceover runs ~158 s at Kokoro's 1.0; 1.4 lands the film near two minutes
const TEAMS = 'http://127.0.0.1:8090/';
const MAP = 'http://localhost:5183/';
const TREE = MAP + 'tree?clean=1&caption=0&'; // radial tree; caption=0 so ours is the only caption. No play=1: the render loads every iframe at the start, so an animation would finish long before its scene

// url: null = placeholder (dark frame + caption only); `todo` names the page to swap in. None left.
// h: iframe height (2600 lays out the whole Experts thread so the camera can pan it).
// cam: [x, y, scale] points on the 1920-wide page, the camera moves through them over the scene.
// enter: fade (crossfade over the previous scene), wipe (left-to-right), cut (hard).
const SCENES = [
  { id: 'hook', url: TEAMS + '?beat=2&channel=experts', h: 2600, enter: 'cut', cam: [[1150, 900, 1.15], [1110, 915, 1.6]],
    caption: 'Hidden knowledge. One expert. Nothing written down.',
    vo: 'Have you had this one? The link is up, everything looks fine, and traffic is still dead. The person who knows the fix is one expert, and it is written down nowhere. Every time he leaves, retires, or is on holiday, the network team starts from zero.' },
  { id: 'veikko', url: TEAMS + '?beat=2&channel=experts', h: 2600, enter: 'fade', cam: [[1150, 420, 1.0], [1120, 215, 1.55]],
    caption: "Elisa's real example",
    vo: 'Veikko is at a site. He swapped an optical module, the link is up, alarms are clear, and traffic is still dead.' },
  { id: 'silent', url: TEAMS + '?beat=1', enter: 'fade', cam: [[1150, 540, 1.0], [1090, 245, 1.7]],
    caption: 'No captured context applies to this incident; nothing to add.',
    vo: 'The layer is listening. It knows nothing about this yet, so it says nothing.' },
  { id: 'capture', url: TEAMS + '?beat=2&channel=experts', h: 2600, enter: 'fade', cam: [[1150, 560, 1.4], [1150, 690, 1.7], [1100, 1000, 1.25]],
    caption: 'Saved as a tip. Nothing for you to do.',
    vo: "Erkki answers from experience: bounce the interface, don't reboot. He says it in chat, and again in an email. The layer notes it. One tip, two sources, his words kept verbatim." },
  { id: 'scopes', url: TREE + 't=16', enter: 'wipe', cam: [[960, 540, 1.0], [1300, 200, 1.35]],
    caption: 'Five candidate scopes. No guess.',
    vo: "The tip is classified: an incident, after an SFP swap, link up and counters at zero. And because nobody said exactly which units this applies to, it is filed under every scope it might be: this model, this firmware, this site, this region, and 'older units', with an open edge at 2019. Nothing is decided yet." },
  { id: 'status', url: TEAMS + '?beat=3', enter: 'wipe', cam: [[1150, 540, 1.0], [1150, 262, 1.6]],
    caption: '',
    vo: "Six days later, same symptoms on a different site. The layer finds Erkki's tip, but the scope is unclear, so it asks him once, in his own thread." },
  { id: 'question', url: TEAMS + '?beat=3&channel=experts', enter: 'fade', cam: [[1150, 600, 1.0], [1210, 785, 1.7]],
    caption: 'Answered: All older units',
    vo: 'One tap: all older units. That answer becomes the source. The other scopes fall away.' },
  { id: 'honed', url: TREE + 't=28', enter: 'wipe', cam: [[960, 540, 1.0], [1350, 200, 1.35]],
    caption: 'Honed by one answer.',
    vo: 'On the graph, the pathway lights: trigger, tip, scope, and the four unused candidates are gone.' },
  { id: 'sami', url: TEAMS + '?beat=7', enter: 'wipe', cam: [[1150, 500, 1.0], [1160, 770, 1.6]],
    caption: '[CA-0001] Disable the interface, wait a little, then enable it again. Avoid: sfp.replace, node.reboot. Source: Erkki Expert (teams, email), 1 case, verified_by_outcome.',
    vo: 'A day later, Sami in Helsinki, never spoke to Erkki. The layer walks the same path, cites Erkki, and relays the fix. Nobody is interrupted.' },
  { id: 'notice', url: TEAMS + '?beat=7&channel=experts', enter: 'fade', min: 3.4, cam: [[1150, 700, 1.2], [1200, 862, 1.9]],
    caption: 'Your tip from 2026-11-01 was proposed for TRN-105 today.',
    vo: 'Erkki just sees that his tip travelled.' },
  { id: 'merge', url: TREE + 't=18', enter: 'wipe', cam: [[960, 540, 1.0], [1300, 200, 1.35]],
    caption: 'Same meaning, one tip.',
    vo: "Erkki's email says the same thing in different words. It is not a new tip: it merges as a second source on the same one. Same trigger, same action, one key." },
  { id: 'decline', url: TEAMS + '?beat=4', enter: 'wipe', cam: [[1150, 640, 1.1], [1080, 660, 1.7]],
    caption: 'install year 2023 is beyond the known edge 2019',
    vo: 'It also knows when to stop. A 2023 unit is beyond anything Erkki has seen, so it declines and asks him where the edge is.' },
  { id: 'dispute', url: TREE + 'src=dispute&t=32', enter: 'wipe', cam: [[960, 540, 1.0], [1380, 300, 1.3]],
    caption: 'Two experts disagree: kept both, not guessed',
    vo: 'Two experts disagree. It keeps both, marks the dispute, and does not pick a winner.' },
  { id: 'hunch', url: TREE + 'src=hunch&t=28', enter: 'fade', cam: [[960, 540, 1.0], [620, 700, 1.3]],
    caption: 'Heard second-hand: kept, never relayed',
    vo: 'Someone heard the key might have moved. It is kept as a hunch, never relayed, and never replaces what is verified.' },
  { id: 'expiry', url: TEAMS + '?beat=8&channel=site-access', enter: 'wipe', cam: [[1150, 800, 1.3], [1060, 840, 1.8]],
    caption: 'expired 2026-11-20',
    vo: 'A road closure expires on the date the engineer gave.' },
  { id: 'retract', url: TEAMS + '?beat=9&channel=experts', enter: 'cut', cam: [[1150, 800, 1.3], [1080, 805, 1.8]],
    caption: 'under review',
    vo: 'And when Erkki takes a tip back, it goes under review, not deleted.' },
  { id: 'value', url: TEAMS + '?beat=7', enter: 'fade', cam: [[1160, 770, 1.5], [1150, 540, 1.0]],
    caption: '12 messages · 1 assertion · 0 forms · 1 tap',
    vo: 'What it cost the team: twelve messages they were writing anyway, one tap from Erkki, no forms. What they got: two engineers on two sites fixed the fault from one conversation, and every suggestion carries its source, its scope, and the date it stopped being true.' },
  { id: 'model', url: MAP + '?beat=7&clean=1', enter: 'wipe', cam: [[960, 540, 1.0], [1350, 440, 1.5]],
    caption: '12 messages · 1 assertion · 0 forms · 1 tap',
    vo: 'The model reads the language; the code decides scope and trust; nothing touches the network.' },
  { id: 'end', url: TREE + 't=63', enter: 'wipe', hold: 2.5, cam: [[960, 540, 1.0], [960, 540, 1.06]],
    caption: 'Capture. Bind. Recall.', vo: '' },
];

const LEAD = 0.2, TAIL = 0.4, XF = 0.4, BLACK = 1.0;

function wav(text) {
  const file = `assets/vo/${createHash('sha1').update(VOICE + '|' + SPEED + '|' + text).digest('hex').slice(0, 12)}.wav`;
  if (!existsSync(file)) {
    if (!process.env.HYPERFRAMES_PYTHON) throw new Error('set HYPERFRAMES_PYTHON to the Kokoro venv python first');
    const txt = join(tmpdir(), 'elisa-vo.txt'); writeFileSync(txt, text); // a file, so the shell never splits or mangles the line
    execFileSync('npx', ['--yes', HF, 'tts', txt, '-o', file, '-v', VOICE, '-s', SPEED], { stdio: 'inherit', shell: true });
  }
  const d = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString();
  return { file, d };
}

// keep the scaled page covering the frame: no empty edges
function camXY([px, py, s], h) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { x: +clamp(960 - px * s, 1920 - 1920 * s, 0).toFixed(1), y: +clamp(540 - py * s, 1080 - h * s, 0).toFixed(1), scale: s };
}
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

let t = 0, html = '', js = '';
const rows = [];
SCENES.forEach((sc, i) => {
  const a = sc.vo ? wav(sc.vo) : null;
  const len = Math.max(a ? (sc.sting ? a.d + 0.3 : LEAD + a.d + TAIL) : sc.hold, sc.min || 0); // min: a caption that needs longer to read than its line
  const last = i === SCENES.length - 1;
  const dur = +(len + (last ? BLACK : XF)).toFixed(3); // runs under the next scene's entrance
  const h = sc.h || 1080;
  const body = sc.url
    ? `<div class="cam" id="cam-${sc.id}"><iframe src="${esc(sc.url)}" style="height:${h}px"></iframe></div>`
    : `<!-- PLACEHOLDER awaiting the tree view: ${esc(sc.todo)} --><div class="ph" data-placeholder="${esc(sc.todo)}"></div>`;
  const cap = sc.caption ? `<div class="cap"><span id="cap-${sc.id}">${esc(sc.caption)}</span></div>` : '';
  html += `
      <div id="s-${sc.id}" class="clip scene" data-start="${t.toFixed(3)}" data-duration="${dur}" data-track-index="${1 + (i % 2)}" data-track-kind="graphics" style="z-index:${i + 1}">
        <div class="inner" id="in-${sc.id}">${body}${cap}</div>
      </div>`;
  if (a) html += `
      <audio id="vo-${sc.id}" src="${a.file}" data-start="${(t + (sc.sting ? 0.05 : LEAD)).toFixed(3)}" data-duration="${a.d.toFixed(3)}" data-track-index="0"></audio>`;
  if (sc.url) {
    const pts = sc.cam.map((p) => camXY(p, h));
    js += `\n  tl.set("#cam-${sc.id}", ${JSON.stringify(pts[0])}, ${t.toFixed(3)});`;
    const seg = dur / (pts.length - 1);
    pts.slice(1).forEach((p, k) => {
      js += `\n  tl.to("#cam-${sc.id}", { ...${JSON.stringify(p)}, duration: ${seg.toFixed(3)}, ease: "sine.inOut" }, ${(t + k * seg).toFixed(3)});`;
    });
  }
  if (sc.enter === 'fade') js += `\n  tl.fromTo("#in-${sc.id}", { opacity: 0 }, { opacity: 1, duration: ${XF}, ease: "power1.inOut" }, ${t.toFixed(3)});`;
  if (sc.enter === 'wipe') js += `\n  tl.fromTo("#in-${sc.id}", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: ${XF}, ease: "power2.inOut" }, ${t.toFixed(3)});`;
  if (sc.caption && i > 0) js += `\n  tl.fromTo("#cap-${sc.id}", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, ${(t + 0.25).toFixed(3)});`;
  if (last) js += `\n  tl.to("#in-${sc.id}", { opacity: 0, duration: ${BLACK}, ease: "power1.in" }, ${(t + len).toFixed(3)});`;
  rows.push(`${sc.id.padEnd(9)} ${t.toFixed(2).padStart(6)}s  ${len.toFixed(2).padStart(5)}s  ${a ? a.d.toFixed(2) + 's wav' : 'no vo'}  ${sc.url || 'PLACEHOLDER ' + sc.todo}`);
  t += len;
});
const total = +(t + BLACK).toFixed(3);

writeFileSync('index.html', `<!doctype html>
<!-- GENERATED by build.mjs: edit the scene list there, then run node build.mjs -->
<html lang="en" data-resolution="landscape">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; font-family: "Source Sans 3", system-ui, sans-serif; background: #000; }
      .clip { position: absolute; inset: 0; }
      .scene { overflow: hidden; }
      .inner { position: absolute; inset: 0; background: #1f1f1f; }
      .cam { position: absolute; left: 0; top: 0; width: 1920px; transform-origin: 0 0; }
      .cam iframe { display: block; width: 1920px; border: 0; }
      .ph { position: absolute; inset: 0; background: #14161b; }
      .cap { position: absolute; left: 0; right: 0; bottom: 96px; text-align: center; padding: 0 200px; }
      .cap span { display: inline-block; max-width: 1520px; padding: 14px 30px; border-radius: 12px; background: rgba(10, 10, 14, 0.82);
                  color: #fff; font-size: 44px; font-weight: 600; line-height: 1.25; }
      #cap-sami { font-size: 34px; font-weight: 400; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1920" data-height="1080">${html}
    </div>
    <script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });${js}
  window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`);
console.log(rows.join('\n') + `\ntotal ${total}s`);
