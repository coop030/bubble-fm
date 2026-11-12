// Spotify playlist covers for Breakfast, Boogie and Date Night.
//   node src/covers.js   writes covers/<playlist>.jpg (3000x3000) and covers/<playlist>-640.jpg (under 256 KB)
const { Resvg } = require('@resvg/resvg-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { DEFS, HEART, SPARK, bubble, stickerText, icon, glow, FONTS } = require('./render');

const S = 1000;

// A croissant: one fat crescent with curved layer lines and glossy highlights.
const croissant = `
  <defs>
    <linearGradient id="crust" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffdc8f"/><stop offset="0.55" stop-color="#f5a84a"/><stop offset="1" stop-color="#d6802f"/>
    </linearGradient>
  </defs>
  <g transform="translate(500 520)">
    <ellipse cx="0" cy="130" rx="280" ry="26" fill="#c98ae8" opacity="0.45"/>
    <path d="M -275 95 C -300 -70 -160 -190 0 -190 C 160 -190 300 -70 275 95 C 255 120 215 105 185 70 C 120 -5 -120 -5 -185 70 C -215 105 -255 120 -275 95 Z"
      fill="url(#crust)" stroke="#c46a26" stroke-width="9" stroke-linejoin="round"/>
    <path d="M -70 -184 C -95 -120 -95 -60 -78 -12" stroke="#c46a26" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M 70 -184 C 95 -120 95 -60 78 -12" stroke="#c46a26" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M -180 -135 C -205 -70 -195 0 -168 52" stroke="#c46a26" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M 180 -135 C 205 -70 195 0 168 52" stroke="#c46a26" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M -250 -40 C -262 10 -255 55 -238 90" stroke="#c46a26" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M 250 -40 C 262 10 255 55 238 90" stroke="#c46a26" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="-20" cy="-140" rx="44" ry="16" fill="#fff6dd" opacity="0.8" transform="rotate(-8 -20 -140)"/>
    <ellipse cx="-135" cy="-110" rx="26" ry="11" fill="#fff6dd" opacity="0.7" transform="rotate(-35 -135 -110)"/>
    <ellipse cx="125" cy="-115" rx="26" ry="11" fill="#fff6dd" opacity="0.7" transform="rotate(30 125 -115)"/>
    ${icon(HEART, -40, -320, 80, '#ff5fb8', -10)}
    ${icon(HEART, 70, -270, 46, '#ff9fd8', 12)}
    ${icon(SPARK, 210, -160, 50, '#ffffff')}
    ${icon(SPARK, -260, -140, 36, '#fff6b0')}
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
    motif: croissant,
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
