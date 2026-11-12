// Renders the Bubble FM daily carousel (cover + 3 track slides) as 1080x1440 JPEGs.
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const path = require('path');

const W = 1080;
const H = 1440;
const FONTS = ['BagelFatOne-Regular.ttf', 'Fredoka-Medium.ttf', 'Fredoka-Bold.ttf'].map((f) =>
  path.join(__dirname, '..', 'fonts', f)
);

const PLAYLIST_STYLE = {
  breakfast: {
    label: 'breakfast',
    bg: `<linearGradient id="slideBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe4f5"/><stop offset="1" stop-color="#f2b8ff"/></linearGradient>`,
    blobs: [['#ffd6aa', 880, 260, 260, 0.9], ['#8ff0ff', 180, 1180, 260, 0.55]],
    shadow: '#ff7fc8',
    labelTop: '#7a2ad0',
    labelLayers: ['#ffffff', '#ff7fc8'],
    heart: '#ff5fb8',
  },
  boogie: {
    label: 'boogie',
    bg: `<linearGradient id="slideBg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9d3cff"/><stop offset="1" stop-color="#ff4fb8"/></linearGradient>`,
    blobs: [['#ff8cdc', 200, 1150, 320, 0.8], ['#ffe678', 900, 200, 240, 0.45]],
    shadow: '#b0309a',
    heart: '#fff6b0',
  },
  datenight: {
    label: 'date night',
    bg: `<linearGradient id="slideBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c0f63"/><stop offset="1" stop-color="#12052f"/></linearGradient>`,
    blobs: [['#785aff', 760, 1240, 340, 0.65], ['#ff5fb8', 200, 220, 260, 0.4]],
    shadow: '#6a3cff',
    heart: '#ff5fb8',
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
  <linearGradient id="tint" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ff8ad8"/><stop offset="0.5" stop-color="#8fe9ff"/><stop offset="1" stop-color="#c9a0ff"/>
  </linearGradient>
  <radialGradient id="rim" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.82" stop-color="#fff" stop-opacity="0"/>
    <stop offset="0.9" stop-color="#8ff0ff" stop-opacity="0.45"/>
    <stop offset="0.95" stop-color="#ff7fd4" stop-opacity="0.75"/>
    <stop offset="0.985" stop-color="#b98bff" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#fff" stop-opacity="1"/>
  </radialGradient>
  <filter id="soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="shade" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="18"/></filter>`;

const HEART = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.8 6.6 4.8c2.2 0 3.6 1.3 4.4 2.6.8-1.3 2.2-2.6 4.4-2.6 3.6 0 5.7 3.6 4.2 7-2.1 4.6-9.6 9.2-9.6 9.2z';
const SPARK = 'M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0z';

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function rng(seed) {
  let s = (seed * 7919) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const icon = (d, x, y, size, fill, rot = 0) =>
  `<path d="${d}" fill="${fill}" transform="translate(${x} ${y}) rotate(${rot} ${size / 2} ${size / 2}) scale(${size / 24})"/>`;

// One glossy soap bubble of radius r centred on (x, y).
function bubble(x, y, r, { fill = true } = {}) {
  const k = r / 50;
  return `<g transform="translate(${x} ${y}) scale(${k.toFixed(3)})">
    ${fill ? '<circle r="50" fill="url(#iri)"/><circle r="50" fill="url(#tint)" opacity="0.38"/>' : '<circle r="50" fill="url(#rim)"/>'}
    <ellipse cx="-20" cy="-22" rx="15" ry="8" fill="#fff" opacity="0.92" transform="rotate(-38 -20 -22)"/>
    <circle cx="-34" cy="-4" r="3.5" fill="#fff" opacity="0.85"/>
    <path d="M 22 36 A 42 42 0 0 0 40 14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.6"/>
  </g>`;
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

// Background colour drifts dawn pink -> night violet and back over 60 days.
function driftColors(day) {
  const phase = ((day - 1) % 60) / 30;
  const t = phase <= 1 ? phase : 2 - phase;
  const h = Math.round(328 - t * 72);
  const l = Math.round(80 - t * 52);
  return { top: `hsl(${h}, 88%, ${l}%)`, bottom: `hsl(${h - 18}, 80%, ${Math.max(10, l - 16)}%)`, t };
}

function coverSvg(day) {
  const r = rng(day);
  const c = driftColors(day);
  const dayStr = String(day).padStart(3, '0');
  const g = (min, span) => Math.round(min + r() * span);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${DEFS}
    <linearGradient id="bg" x1="0.3" y1="0" x2="0.7" y2="1"><stop offset="0" stop-color="${c.top}"/><stop offset="1" stop-color="${c.bottom}"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="160" cy="1220" r="340" fill="#8ff0ff" opacity="0.5" filter="url(#soft)"/>
  <circle cx="960" cy="150" r="300" fill="#ff8ad8" opacity="0.55" filter="url(#soft)"/>
  <circle cx="${g(100, 880)}" cy="${g(300, 800)}" r="220" fill="#ffd6aa" opacity="${(0.35 - c.t * 0.25).toFixed(2)}" filter="url(#soft)"/>
  ${(() => { const br = g(200, 70); const bx = g(520, 760 - br - 520 + 200); const by = g(360, 360); return `<ellipse cx="${bx + 20}" cy="${by + br + 60}" rx="${Math.round(br * 0.75)}" ry="26" fill="#2a0050" opacity="0.22" filter="url(#shade)"/>` + bubble(bx, by, br); })()}
  ${bubble(g(150, 300), g(260, 300), g(85, 40))}
  ${bubble(g(200, 680), g(880, 200), g(40, 25))}
  ${bubble(g(120, 840), g(160, 120), 24)}
  ${icon(SPARK, g(80, 860), g(150, 650), 90, '#fff6b0')}
  ${icon(SPARK, g(80, 900), g(100, 1000), 48, '#ffffff')}
  ${icon(HEART, g(100, 820), g(150, 500), 104, '#ff5fb8', -12)}
  <rect x="64" y="78" width="330" height="92" rx="46" fill="#ff7fc8"/>
  <rect x="64" y="64" width="330" height="92" rx="46" fill="#ffffff" opacity="0.92"/>
  <text x="229" y="128" text-anchor="middle" font-family="Bagel Fat One" font-size="48" fill="#5a1a9c">bubble fm</text>
  ${stickerText('day', 72, 1078, 52, { family: 'Fredoka', weight: 700, layers: ['#b0309a'], step: 5 })}
  ${stickerText(dayStr, 64, 1290, 230, { step: 11 })}
  ${stickerText('music to fall in love to', 72, 1372, 46, { family: 'Fredoka', weight: 700, layers: ['#5a1a9c'], step: 4 })}
</svg>`;
}

function trackSvg({ playlist, index, title, artist, coverDataUri }) {
  const st = PLAYLIST_STYLE[playlist];
  const r = rng(index * 31 + title.length);
  const cx = 540;
  const cy = 640;
  const R = 380;
  const t = fit(title, 860, 70, 44, 0.56);
  const a = fit(artist, 860, 48, 34, 0.52);
  const art = coverDataUri
    ? `<image href="${coverDataUri}" x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="xMidYMid slice" clip-path="url(#artClip)"/>`
    : `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#ffffff" opacity="0.25"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${DEFS}${st.bg}
    <clipPath id="artClip"><circle cx="${cx}" cy="${cy}" r="${R - 26}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#slideBg)"/>
  ${st.blobs.map(([col, x, y, rad, op]) => `<circle cx="${x}" cy="${y}" r="${rad}" fill="${col}" opacity="${op}" filter="url(#soft)"/>`).join('')}
  <ellipse cx="${cx}" cy="${cy + R + 40}" rx="${R * 0.7}" ry="34" fill="#2a0050" opacity="0.28" filter="url(#shade)"/>
  ${art}
  ${bubble(cx, cy, R, { fill: false })}
  ${bubble(Math.round(900 - r() * 60), Math.round(300 + r() * 60), 70)}
  ${bubble(Math.round(130 + r() * 40), Math.round(980 + r() * 40), 40)}
  ${icon(HEART, 70, 230 + Math.round(r() * 60), 120, st.heart, -12)}
  ${icon(SPARK, 880, 960, 80, '#fff6b0')}
  ${icon(SPARK, 960, 190, 40, '#ffffff')}
  ${stickerText(st.label, 64, 150, 88, { top: st.labelTop || '#fff', layers: st.labelLayers || [st.shadow, '#4b1590'], step: 6 })}
  <rect x="${W - 64 - 150}" y="84" width="150" height="72" rx="36" fill="#ffffff" opacity="0.9"/>
  <text x="${W - 64 - 75}" y="134" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#5a1a9c">${index}/3</text>
  <rect x="64" y="1168" width="${W - 128}" height="208" rx="48" fill="${st.shadow}"/>
  <rect x="64" y="1152" width="${W - 128}" height="208" rx="48" fill="#ffffff" opacity="0.94"/>
  <text x="110" y="${1152 + 92}" font-family="Fredoka" font-weight="700" font-size="${t.size}" fill="#3a1062">${esc(t.text)}</text>
  <text x="110" y="${1152 + 162}" font-family="Fredoka" font-weight="500" font-size="${a.size}" fill="#5a2a8a">${esc(a.text)}</text>
</svg>`;
}

async function toJpeg(svg) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Fredoka' },
  })
    .render()
    .asPng();
  return sharp(png).jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
}

async function renderPost(day, tracks) {
  const slides = [await toJpeg(coverSvg(day))];
  for (let i = 0; i < tracks.length; i++) {
    slides.push(await toJpeg(trackSvg({ ...tracks[i], index: i + 1 })));
  }
  return slides;
}

module.exports = { renderPost, coverSvg, trackSvg };
