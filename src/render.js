// Renders the Bubble FM daily carousel (cover + 3 track slides) at 4:5 (1080x1350).
// Each slide becomes a seamless looping MP4 (floating bubbles, slowly shifting background)
// plus a still JPEG of its first frame.
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const os = require('os');

const W = 1080;
const H = 1350;
const FPS = Number(process.env.VIDEO_FPS || 30);
const SECONDS = Number(process.env.VIDEO_SECONDS || 6);
const FONTS = ['BagelFatOne-Regular.ttf', 'Fredoka-Medium.ttf', 'Fredoka-Bold.ttf'].map((f) =>
  path.join(__dirname, '..', 'fonts', f)
);
const TAU = Math.PI * 2;

const PLAYLIST_STYLE = {
  breakfast: {
    label: 'breakfast',
    stops: [[330, 100, 95], [292, 95, 86]],
    blobs: [['#ffd6aa', 860, 240, 380, 0.9], ['#8ff0ff', 180, 1100, 380, 0.55]],
    shadow: '#ff7fc8',
    labelTop: '#7a2ad0',
    labelLayers: ['#ffffff', '#ff7fc8'],
    heart: '#ff5fb8',
    vertical: true,
  },
  boogie: {
    label: 'boogie',
    stops: [[272, 100, 62], [326, 100, 65]],
    blobs: [['#ff8cdc', 200, 1080, 440, 0.8], ['#ffe678', 900, 200, 340, 0.45]],
    shadow: '#b0309a',
    heart: '#fff6b0',
  },
  datenight: {
    label: 'date night',
    stops: [[260, 73, 22], [262, 81, 10]],
    blobs: [['#785aff', 760, 1160, 460, 0.65], ['#ff5fb8', 200, 220, 360, 0.4]],
    shadow: '#6a3cff',
    heart: '#ff5fb8',
    vertical: true,
  },
};

const DEFS = `
  <radialGradient id="iri" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff" stop-opacity="0.08"/>
    <stop offset="0.58" stop-color="#ffd6f5" stop-opacity="0.22"/>
    <stop offset="0.76" stop-color="#8ff0ff" stop-opacity="0.5"/>
    <stop offset="0.88" stop-color="#ff7fd4" stop-opacity="0.75"/>
    <stop offset="0.96" stop-color="#b98bff" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </radialGradient>
  <radialGradient id="rim" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.82" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.9" stop-color="#8ff0ff" stop-opacity="0.45"/>
    <stop offset="0.95" stop-color="#ff7fd4" stop-opacity="0.75"/>
    <stop offset="0.985" stop-color="#b98bff" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </radialGradient>
  <linearGradient id="tint" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff8ad8"/><stop offset="0.5" stop-color="#8fe9ff"/><stop offset="1" stop-color="#c9a0ff"/>
  </linearGradient>
  <radialGradient id="shadeGrad" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#2a0050" stop-opacity="0.32"/><stop offset="1" stop-color="#2a0050" stop-opacity="0"/>
  </radialGradient>`;

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.8 6.6 4.8c2.2 0 3.6 1.3 4.4 2.6.8-1.3 2.2-2.6 4.4-2.6 3.6 0 5.7 3.6 4.2 7-2.1 4.6-9.6 9.2-9.6 9.2z';
const SPARK = 'M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rng(seed) {
  let s = Math.abs(Math.round(seed * 7919)) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Loop helpers: every motion uses whole cycles per loop, so the last frame meets the first.
const wave = (p, cycles, phase) => Math.sin(TAU * (p * cycles + phase));

const icon = (d, x, y, size, fill, rot = 0, opacity = 1) =>
  `<path d="${d}" fill="${fill}" opacity="${opacity.toFixed(2)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)} ${size / 2} ${size / 2}) scale(${(size / 24).toFixed(3)})"/>`;

// Soft colour glow, drawn with a radial gradient (much faster to render than a blur filter).
let glowId = 0;
function glow(color, x, y, r, opacity) {
  const id = `glow${glowId++}`;
  return `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="url(#${id})"/>`;
}

const shadow = (x, y, rx, ry) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry}" fill="url(#shadeGrad)"/>`;

// One glossy soap bubble of radius r centred on (x, y).
function bubble(x, y, r, { art = false } = {}) {
  const k = r / 50;
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(4)})">
    ${art ? '<circle r="50" fill="url(#rim)"/>' : '<circle r="50" fill="url(#iri)"/><circle r="50" fill="url(#tint)" opacity="0.38"/>'}
    <ellipse cx="-20" cy="-22" rx="15" ry="8" fill="#fff" opacity="0.92" transform="rotate(-38 -20 -22)"/>
    <circle cx="-34" cy="-4" r="3.5" fill="#fff" opacity="0.85"/>
    <path d="M 22 36 A 42 42 0 0 0 40 14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>
  </g>`;
}

// A floating bubble that bobs, sways and breathes a little.
function floating(b, p, extra) {
  const x = b.x + b.sway * wave(p, b.cx, b.ph);
  const y = b.y + b.bob * wave(p, b.cy, b.ph + 0.25);
  const r = b.r * (1 + 0.025 * wave(p, 2, b.ph));
  return { x, y, r, svg: bubble(x, y, r, extra) };
}

// Small bubbles that rise through the frame and wrap around.
function risers(seed, p, count) {
  const r = rng(seed + 99);
  let out = '';
  for (let i = 0; i < count; i++) {
    const x0 = 60 + r() * (W - 120);
    const size = 10 + r() * 18;
    const start = r();
    const span = H + 120;
    const y = H + 60 - (((start + p) % 1) * span);
    const x = x0 + 18 * wave(p, 2, r());
    out += bubble(x, y, size);
  }
  return out;
}

function twinkle(d, x, y, size, fill, p, phase) {
  const s = 0.75 + 0.25 * (0.5 + 0.5 * wave(p, 2, phase));
  const o = 0.65 + 0.35 * (0.5 + 0.5 * wave(p, 2, phase));
  const sz = size * s;
  return icon(d, x + (size - sz) / 2, y + (size - sz) / 2, sz, fill, 0, o);
}

// Text drawn in layers for the chunky 3D sticker look.
function stickerText(text, x, y, size, { family = 'Bagel Fat One', weight = 400, anchor = 'start', top = '#fff', layers = ['#ff4fa8', '#5a1a9c'], step } = {}) {
  const d = step ?? Math.max(2, Math.round(size / 18));
  const attrs = `x="${x}" text-anchor="${anchor}" font-family="${family}" font-weight="${weight}" font-size="${size}"`;
  const back = layers
    .map((c, i) => `<text ${attrs} y="${y + d * (layers.length - i)}" fill="${c}">${esc(text)}</text>`)
    .join('');
  return back + `<text ${attrs} y="${y}" fill="${top}">${esc(text)}</text>`;
}

// Shrinks the font until the text fits, then truncates with an ellipsis.
function fit(text, maxWidth, size, minSize, ratio) {
  let s = size;
  while (s > minSize && text.length * s * ratio > maxWidth) s -= 2;
  let t = text;
  if (t.length * s * ratio > maxWidth) {
    const max = Math.floor(maxWidth / (s * ratio)) - 1;
    t = t.slice(0, Math.max(1, max)).trimEnd() + '…';
  }
  return { text: t, size: s };
}

// resvg only reads whole-number hsl(), so colours are converted to hex.
function hsl(h, sat, l) {
  h = ((h % 360) + 360) % 360;
  sat /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

// Day colour drifts dawn pink -> night violet and back over 60 days; within the loop it breathes ±5°.
function driftColors(day, p) {
  const phase = ((day - 1) % 60) / 30;
  const t = phase <= 1 ? phase : 2 - phase;
  const shift = 5 * wave(p, 1, 0);
  const h = 328 - t * 72 + shift;
  const l = 80 - t * 52;
  return {
    top: hsl(h, 88, l),
    bottom: hsl(h - 18, 80, Math.max(10, l - 16)),
    t,
  };
}

function coverScene(day) {
  const r = rng(day);
  const g = (min, span) => min + r() * span;
  const big = g(200, 70);
  return {
    big: { x: g(520, 440 - big), y: g(340, 320), r: big, sway: 14, bob: 22, cx: 1, cy: 1, ph: r() },
    mid: { x: g(150, 300), y: g(240, 280), r: g(85, 40), sway: 18, bob: 26, cx: 1, cy: 2, ph: r() },
    small: { x: g(200, 680), y: g(820, 160), r: g(40, 25), sway: 14, bob: 20, cx: 2, cy: 1, ph: r() },
    tiny: { x: g(120, 840), y: g(150, 100), r: 24, sway: 10, bob: 14, cx: 2, cy: 2, ph: r() },
    sparks: [[g(80, 860), g(150, 600), 90, '#fff6b0', r()], [g(80, 900), g(100, 900), 48, '#ffffff', r()]],
    heart: [g(100, 820), g(150, 450), 104, r()],
    glowX: g(100, 880),
    glowY: g(300, 700),
  };
}

function coverSvg(day, p = 0, scene = coverScene(day)) {
  glowId = 0;
  const c = driftColors(day, p);
  const dayStr = String(day).padStart(3, '0');
  const big = floating(scene.big, p);
  const orbit = (x, y, rad, ph) => [x + rad * wave(p, 1, ph), y + rad * wave(p, 1, ph + 0.25)];
  const [g1x, g1y] = orbit(160, 1140, 60, 0);
  const [g2x, g2y] = orbit(960, 140, 50, 0.4);
  const [g3x, g3y] = orbit(scene.glowX, scene.glowY, 70, 0.7);
  const [hx, hy, hs, hph] = scene.heart;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${DEFS}
    <linearGradient id="bg" x1="${(0.3 + 0.05 * wave(p, 1, 0.1)).toFixed(3)}" y1="0" x2="${(0.7 - 0.05 * wave(p, 1, 0.1)).toFixed(3)}" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.bottom}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${glow('#8ff0ff', g1x, g1y, 520, 0.55)}
  ${glow('#ff8ad8', g2x, g2y, 460, 0.6)}
  ${glow('#ffd6aa', g3x, g3y, 360, Math.max(0.08, 0.38 - c.t * 0.28))}
  ${risers(day, p, 5)}
  ${shadow(big.x + 20, scene.big.y + scene.big.r + 70, scene.big.r * 0.75 * (1 - 0.06 * wave(p, 1, scene.big.ph + 0.25)), 34)}
  ${big.svg}
  ${floating(scene.mid, p).svg}
  ${floating(scene.small, p).svg}
  ${floating(scene.tiny, p).svg}
  ${scene.sparks.map(([x, y, s, f, ph]) => twinkle(SPARK, x, y, s, f, p, ph)).join('')}
  ${icon(HEART, hx, hy + 10 * wave(p, 1, hph), hs, '#ff5fb8', -12 + 6 * wave(p, 1, hph + 0.1))}
  <rect x="64" y="78" width="330" height="92" rx="46" fill="#ff7fc8"/>
  <rect x="64" y="64" width="330" height="92" rx="46" fill="#ffffff" opacity="0.92"/>
  <text x="229" y="128" text-anchor="middle" font-family="Bagel Fat One" font-size="48" fill="#5a1a9c">bubble fm</text>
  ${stickerText('day', 72, 990, 52, { family: 'Fredoka', weight: 700, layers: ['#b0309a'], step: 5 })}
  ${stickerText(dayStr, 64, 1200, 230, { step: 11 })}
  ${stickerText('music to fall in love to', 72, 1282, 46, { family: 'Fredoka', weight: 700, layers: ['#5a1a9c'], step: 4 })}
</svg>`;
}

function trackScene(track) {
  const r = rng(track.index * 31 + track.title.length);
  return {
    art: { x: 540, y: 600, r: 360, sway: 8, bob: 16, cx: 1, cy: 1, ph: r() },
    a: { x: 880 - r() * 60, y: 300 + r() * 60, r: 70, sway: 16, bob: 24, cx: 1, cy: 2, ph: r() },
    b: { x: 130 + r() * 40, y: 900 + r() * 40, r: 40, sway: 12, bob: 18, cx: 2, cy: 1, ph: r() },
    heartY: 210 + r() * 60,
    ph: r(),
  };
}

function trackSvg(track, p = 0, scene = trackScene(track)) {
  glowId = 0;
  const st = PLAYLIST_STYLE[track.playlist];
  const t = fit(track.title, 860, 70, 44, 0.56);
  const a = fit(track.artist, 860, 48, 34, 0.52);
  const art = floating(scene.art, p, { art: true });
  const R = scene.art.r;
  const shift = 4 * wave(p, 1, 0);
  const [s0, s1] = st.stops;
  const bg = `<linearGradient id="slideBg" x1="0" y1="0" x2="${st.vertical ? 0 : 1}" y2="1">
    <stop offset="0" stop-color="${hsl(s0[0] + shift, s0[1], s0[2])}"/>
    <stop offset="1" stop-color="${hsl(s1[0] + shift, s1[1], s1[2])}"/></linearGradient>`;
  const image = track.coverDataUri
    ? `<image href="${track.coverDataUri}" x="${(art.x - R).toFixed(1)}" y="${(art.y - R).toFixed(1)}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#artClip)"/>`
    : `<circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${R - 26}" fill="#ffffff" opacity="0.25"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${DEFS}${bg}
    <clipPath id="artClip"><circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${(art.r - 26 * (art.r / R)).toFixed(1)}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#slideBg)"/>
  ${st.blobs.map(([col, x, y, rad, op], i) => glow(col, x + 50 * wave(p, 1, i * 0.37), y + 50 * wave(p, 1, i * 0.37 + 0.25), rad, op)).join('')}
  ${risers(track.index * 13 + 5, p, 4)}
  ${shadow(art.x, scene.art.y + R + 40, R * 0.7 * (1 - 0.05 * wave(p, 1, scene.art.ph + 0.25)), 40)}
  ${image}
  ${art.svg}
  ${floating(scene.a, p).svg}
  ${floating(scene.b, p).svg}
  ${icon(HEART, 70, scene.heartY + 10 * wave(p, 1, scene.ph), 120, st.heart, -12 + 6 * wave(p, 1, scene.ph + 0.1))}
  ${twinkle(SPARK, 880, 900, 80, '#fff6b0', p, scene.ph + 0.3)}
  ${twinkle(SPARK, 960, 190, 40, '#ffffff', p, scene.ph + 0.6)}
  ${stickerText(st.label, 64, 150, 88, { top: st.labelTop || '#fff', layers: st.labelLayers || [st.shadow, '#4b1590'], step: 6 })}
  <rect x="${W - 64 - 150}" y="84" width="150" height="72" rx="36" fill="#ffffff" opacity="0.9"/>
  <text x="${W - 64 - 75}" y="134" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#5a1a9c">${track.index}/3</text>
  <rect x="64" y="1094" width="${W - 128}" height="200" rx="48" fill="${st.shadow}"/>
  <rect x="64" y="1078" width="${W - 128}" height="200" rx="48" fill="#ffffff" opacity="0.94"/>
  <text x="110" y="${1078 + 90}" font-family="Fredoka" font-weight="700" font-size="${t.size}" fill="#3a1062">${esc(t.text)}</text>
  <text x="110" y="${1078 + 158}" font-family="Fredoka" font-weight="500" font-size="${a.size}" fill="#5a2a8a">${esc(a.text)}</text>
</svg>`;
}

function rasterize(svg) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Fredoka' },
  }).render();
}

async function toJpeg(svg) {
  const img = rasterize(svg);
  return sharp(Buffer.from(img.pixels), { raw: { width: img.width, height: img.height, channels: 4 } })
    .flatten()
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

// Streams raw frames into ffmpeg and returns the MP4 as a buffer.
function toVideo(svgAt) {
  const tmp = path.join(os.tmpdir(), `bubblefm-${process.pid}-${Date.now()}.mp4`);
  return new Promise((resolve, reject) => {
    const frames = FPS * SECONDS;
    const ff = spawn(ffmpegPath, [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-map', '0:v', '-map', '1:a', '-shortest',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-profile:v', 'high', '-movflags', '+faststart',
      '-c:a', 'aac', '-b:a', '64k',
      tmp,
    ]);
    let err = '';
    ff.stderr.on('data', (c) => (err += c));
    ff.stdin.on('error', () => {}); // ffmpeg's own exit code reports the real problem
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg failed: ${err}`));
      const buf = fs.readFileSync(tmp);
      fs.unlinkSync(tmp);
      resolve(buf);
    });
    (async () => {
      for (let i = 0; i < frames; i++) {
        const img = rasterize(svgAt(i / frames));
        if (!ff.stdin.write(Buffer.from(img.pixels))) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
    })().catch(reject);
  });
}

// Returns one entry per slide: { still: JPEG buffer, video: MP4 buffer or null }.
async function renderPost(day, tracks, { animate = true } = {}) {
  const scenes = [{ at: (p, s) => coverSvg(day, p, s), scene: coverScene(day) }];
  tracks.forEach((t, i) => {
    const track = { ...t, index: i + 1 };
    scenes.push({ at: (p, s) => trackSvg(track, p, s), scene: trackScene(track) });
  });
  const out = [];
  for (const { at, scene } of scenes) {
    const still = await toJpeg(at(0, scene));
    const video = animate ? await toVideo((p) => at(p, scene)) : null;
    out.push({ still, video });
  }
  return out;
}

module.exports = { renderPost, coverSvg, trackSvg, W, H };
