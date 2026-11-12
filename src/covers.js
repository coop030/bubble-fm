// Spotify playlist covers for Breakfast, Boogie and Date Night.
//   node src/covers.js   writes covers/<playlist>.jpg (3000x3000) and covers/<playlist>-640.jpg (under 256 KB)
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { DEFS, HEART, SPARK, bubble, stickerText, icon, glow, FONTS } = require('./render');

const S = 1000;

const coffeeCup = `
  <g transform="translate(500 500)">
    <path d="M -40 -120 C -70 -150 -10 -170 -40 -205" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path d="M 30 -115 C 0 -150 60 -170 30 -210" stroke="#ffffff" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.85"/>
    ${icon(HEART, -20, -300, 60, '#ff5fb8', -10)}
    <ellipse cx="0" cy="150" rx="210" ry="34" fill="#c98ae8"/>
    <ellipse cx="0" cy="140" rx="210" ry="34" fill="#ffffff"/>
    <path d="M 150 -40 C 250 -40 250 90 140 90" stroke="#ffffff" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M -165 -90 L 165 -90 L 140 90 Q 130 140 80 140 L -80 140 Q -130 140 -140 90 Z" fill="#ffffff"/>
    <path d="M -158 -40 L 158 -40 L 151 10 L -151 10 Z" fill="#ff8ad8"/>
    <ellipse cx="0" cy="-90" rx="165" ry="30" fill="#8a4a2f"/>
    <ellipse cx="0" cy="-90" rx="165" ry="30" fill="none" stroke="#ffffff" stroke-width="10"/>
    <path d="M -110 -100 q 20 -8 40 0" stroke="#d9a07c" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${icon(HEART, -32, 40, 64, '#ff8ad8')}
    <ellipse cx="-110" cy="-20" rx="16" ry="50" fill="#ffffff" opacity="0.0"/>
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
    motif: coffeeCup,
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
