// Spotify playlist covers for Breakfast, Boogie and Date Night.
//   node src/covers.js   writes covers/<playlist>.jpg (3000x3000) and covers/<playlist>-640.jpg (under 256 KB)
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { DEFS, HEART, SPARK, bubble, stickerText, icon, glow, FONTS } = require('./render');

const S = 1000;

// A French press: glass jug with coffee, lilac frame, plunger and a pink handle.
const frenchPress = `
  <defs>
    <linearGradient id="coffee" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#a0603a"/><stop offset="1" stop-color="#5e3020"/>
    </linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b48cf0"/><stop offset="0.45" stop-color="#efe4ff"/><stop offset="1" stop-color="#9a6ae0"/>
    </linearGradient>
  </defs>
  <g transform="translate(500 500)">
    <ellipse cx="0" cy="250" rx="200" ry="24" fill="#c98ae8" opacity="0.45"/>
    <rect x="-12" y="-330" width="24" height="110" rx="10" fill="url(#metal)"/>
    <circle cx="0" cy="-340" r="34" fill="#ff8ad8"/>
    <circle cx="-10" cy="-350" r="10" fill="#ffffff" opacity="0.8"/>
    <path d="M 120 -120 C 240 -120 240 140 120 140" stroke="#ff8ad8" stroke-width="38" fill="none" stroke-linecap="round"/>
    <path d="M 132 -100 C 205 -95 205 0 160 10" stroke="#ffffff" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.6"/>
    <rect x="-130" y="-170" width="260" height="400" rx="34" fill="#ffffff" opacity="0.35"/>
    <path d="M -126 -30 L 126 -30 L 126 196 Q 126 226 96 226 L -96 226 Q -126 226 -126 196 Z" fill="url(#coffee)"/>
    <ellipse cx="0" cy="-30" rx="126" ry="16" fill="#d9a07c"/>
    <rect x="-130" y="-170" width="260" height="400" rx="34" fill="none" stroke="#ffffff" stroke-width="8"/>
    <rect x="-150" y="-226" width="300" height="64" rx="28" fill="url(#metal)"/>
    <rect x="-150" y="-226" width="300" height="64" rx="28" fill="none" stroke="#ffffff" stroke-width="5" opacity="0.7"/>
    <rect x="-146" y="40" width="292" height="26" rx="13" fill="url(#metal)"/>
    <rect x="-150" y="210" width="300" height="44" rx="20" fill="url(#metal)"/>
    <rect x="-96" y="-150" width="22" height="330" rx="11" fill="#ffffff" opacity="0.55"/>
    ${icon(HEART, -32, 100, 64, '#ff8ad8')}
    <path d="M -60 -270 C -85 -300 -35 -320 -60 -355" stroke="#ffffff" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M 60 -270 C 35 -300 85 -320 60 -355" stroke="#ffffff" stroke-width="12" fill="none" stroke-linecap="round" opacity="0.8"/>
    ${icon(HEART, 90, -400, 56, '#ff5fb8', 12)}
    ${icon(SPARK, -250, -150, 46, '#ffffff')}
    ${icon(SPARK, 230, 180, 34, '#fff6b0')}
  </g>`;

const discoBall = (() => {
  let tiles = '';
  for (let y = -150; y <= 150; y += 38) tiles += `<line x1="-170" y1="${y}" x2="170" y2="${y}" stroke="#7c5bc4" stroke-width="4" opacity="0.55"/>`;
  for (const rx of [30, 75, 115, 150]) tiles += `<ellipse cx="0" cy="0" rx="${rx}" ry="170" fill="none" stroke="#7c5bc4" stroke-width="4" opacity="0.55"/>`;
  tiles += `<line x1="0" y1="-170" x2="0" y2="170" stroke="#7c5bc4" stroke-width="4" opacity="0.55"/>`;
  return `
  <defs>
    <radialGradient id="ballGrad" cx="35%" cy="30%" r="75%">
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.45" stop-color="#e6d6ff"/><stop offset="1" stop-color="#9b6ef0"/>
    </radialGradient>
    <clipPath id="ballClip"><circle cx="0" cy="0" r="170"/></clipPath>
  </defs>
  <g transform="translate(500 520)">
    <line x1="0" y1="-330" x2="0" y2="-170" stroke="#ffffff" stroke-width="8" opacity="0.8"/>
    <circle r="170" fill="url(#ballGrad)"/>
    <g clip-path="url(#ballClip)">
      ${tiles}
      <rect x="-110" y="-120" width="34" height="34" fill="#ffffff" opacity="0.9"/>
      <rect x="40" y="-30" width="34" height="34" fill="#8ff0ff" opacity="0.7"/>
      <rect x="-70" y="50" width="34" height="34" fill="#ff8ad8" opacity="0.7"/>
      <rect x="80" y="70" width="34" height="34" fill="#fff6b0" opacity="0.7"/>
    </g>
    <circle r="170" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.8"/>
    ${icon(SPARK, -150, -170, 70, '#ffffff')}
    ${icon(SPARK, 110, 60, 46, '#fff6b0')}
  </g>`;
})();

const moon = `
  <defs>
    <mask id="moonMask"><rect x="-300" y="-300" width="600" height="600" fill="#fff"/><circle cx="80" cy="-50" r="160" fill="#000"/></mask>
    <linearGradient id="moonGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset="1" stop-color="#ffc56b"/></linearGradient>
  </defs>
  <g transform="translate(510 545)">
    <circle r="190" fill="url(#moonGrad)" mask="url(#moonMask)"/>
    <circle cx="-110" cy="40" r="18" fill="#ffd98a" opacity="0.8"/>
    <circle cx="-60" cy="120" r="12" fill="#ffd98a" opacity="0.8"/>
    ${icon(HEART, 70, 40, 110, '#ff5fb8', 12)}
    ${icon(HEART, 150, -40, 70, '#ff9fd8', -10)}
    ${icon(SPARK, 60, -200, 60, '#ffffff')}
    ${icon(SPARK, 180, 140, 40, '#fff6b0')}
    ${icon(SPARK, -200, -160, 34, '#ffffff')}
  </g>`;

const COVERS = {
  breakfast: {
    bg: ['#ffe4f5', '#f2b8ff'],
    glows: [['#ffd6aa', 820, 200, 420, 0.9], ['#8ff0ff', 150, 880, 420, 0.55]],
    motif: frenchPress,
    name: 'breakfast',
    top: '#7a2ad0',
    layers: ['#ffffff', '#ff7fc8'],
    pill: '#ffffff',
    pillText: '#7a2ad0',
  },
  boogie: {
    bg: ['#9d3cff', '#ff4fb8'],
    glows: [['#ff8cdc', 180, 860, 460, 0.8], ['#ffe678', 860, 160, 380, 0.5]],
    motif: discoBall,
    name: 'boogie',
    top: '#ffffff',
    layers: ['#b0309a', '#4b1590'],
    pill: '#ffffff',
    pillText: '#7a2ad0',
  },
  datenight: {
    bg: ['#2c0f63', '#12052f'],
    glows: [['#785aff', 780, 900, 480, 0.7], ['#ff5fb8', 180, 180, 400, 0.45]],
    motif: moon,
    name: 'date night',
    top: '#ffffff',
    layers: ['#ff4fa8', '#6a3cff'],
    pill: '#ffffff',
    pillText: '#3a1062',
  },
};

function coverSvg(key) {
  const c = COVERS[key];
  const vertical = key !== 'boogie';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>${DEFS}
    <linearGradient id="bg" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="1"><stop offset="0" stop-color="${c.bg[0]}"/><stop offset="1" stop-color="${c.bg[1]}"/></linearGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  ${c.glows.map(([col, x, y, r, o]) => glow(col, x, y, r, o)).join('')}
  <ellipse cx="500" cy="815" rx="230" ry="26" fill="url(#shadeGrad)"/>
  <circle cx="500" cy="470" r="330" fill="#ffffff" opacity="0.12"/>
  <g transform="translate(500 470) scale(0.78) translate(-500 -500)">${c.motif}</g>
  ${bubble(500, 470, 330, { art: true })}
  ${bubble(860, 250, 54)}
  ${bubble(140, 690, 34)}
  ${bubble(820, 760, 22)}
  <rect x="50" y="56" width="280" height="80" rx="40" fill="#ff7fc8"/>
  <rect x="50" y="44" width="280" height="80" rx="40" fill="${c.pill}" opacity="0.94"/>
  <text x="190" y="100" text-anchor="middle" font-family="Bagel Fat One" font-size="42" fill="${c.pillText}">bubble fm</text>
  ${stickerText(c.name, 500, 935, c.name.length > 8 ? 128 : 140, { anchor: 'middle', top: c.top, layers: c.layers, step: 8 })}
</svg>`;
}

async function main() {
  const outDir = path.join(__dirname, '..', 'covers');
  fs.mkdirSync(outDir, { recursive: true });
  for (const key of Object.keys(COVERS)) {
    const png = new Resvg(coverSvg(key), {
      fitTo: { mode: 'width', value: 3000 },
      font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Fredoka' },
    })
      .render()
      .asPng();
    await sharp(png).flatten().jpeg({ quality: 92 }).toFile(path.join(outDir, `${key}.jpg`));
    // Spotify's upload API caps covers at 256 KB.
    let q = 90;
    let small;
    do {
      small = await sharp(png).flatten().resize(640, 640).jpeg({ quality: q }).toBuffer();
      q -= 5;
    } while (small.length > 250 * 1024 && q > 40);
    fs.writeFileSync(path.join(outDir, `${key}-640.jpg`), small);
    console.log(`covers/${key}.jpg and covers/${key}-640.jpg (${Math.round(small.length / 1024)} KB)`);
  }
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { coverSvg };
