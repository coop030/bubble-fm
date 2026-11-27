// Bubble FM Reel: one track a day, 9:16, as a seamless loop.
// The cover art spins inside a big glossy bubble like a record, little bubbles orbit it,
// and a bubble equalizer bounces in the track card. Text stays clear of Instagram's Reel UI.
const R = require('./render');

const RW = 1080;
const RH = 1920;
const { TAU, K, wave, slow, esc, rng, DEFS, HEART, SPARK, icon, glow, bubble, stickerText } = R;

function reelScene(track) {
  const r = rng(track.title.length * 31 + (track.day || 0));
  return {
    art: { x: 540, y: 880, r: 350, sway: 10, bob: 20, cx: 1, cy: 1, ph: r() },
    orbit: [0, 1, 2].map((i) => ({ size: [54, 34, 24][i], start: r() + i / 3, rx: 470 - i * 30, ry: 140 + i * 30, dir: i === 1 ? -1 : 1 })),
    a: { x: 900 - r() * 60, y: 560 + r() * 60, r: 64, sway: 16, bob: 24, cx: 1, cy: 2, ph: r() },
    b: { x: 150 + r() * 40, y: 1360 + r() * 30, r: 40, sway: 12, bob: 18, cx: 2, cy: 1, ph: r() },
    heart: [70 + r() * 30, 520 + r() * 60],
    ph: r(),
  };
}

function reelStyle(track) {
  const st0 = R.PLAYLIST_STYLE[track.playlist];
  const space = R.SPACE_STYLE[track.playlist];
  const sp = R.spaceMix(track.day);
  return {
    ...st0,
    sp,
    space,
    blobs: st0.blobs.map(([col, x, y, rad, op], i) => [R.mixHex(col, space.blobs[i], sp), x, y * (RH / 1350), rad * 1.2, op * (1 - 0.25 * sp)]),
    labelTop: sp >= 0.5 ? '#fff' : st0.labelTop || '#fff',
    labelLayers: sp >= 0.5 ? [st0.shadow, '#4b1590'] : st0.labelLayers || [st0.shadow, '#4b1590'],
  };
}

function reelSvg(track, p = 0, scene = reelScene(track)) {
  R.resetGlow();
  const st = reelStyle(track);
  const { sp, space } = st;
  const shift = 4 * slow(p, 1, 0);
  const [s0, s1] = st.stops;
  const top = R.mixHex(R.hsl(s0[0] + shift, s0[1], s0[2]), space.stops[0], sp);
  const bottom = R.mixHex(R.hsl(s1[0] + shift, s1[1], s1[2]), space.stops[1], sp);

  const art = R.floating(scene.art, p, { art: true });
  const AR = scene.art.r;
  const inner = art.r - 26 * (art.r / AR);
  // One full turn per loop, like a record on a slow platter.
  const spin = (360 * p).toFixed(2);
  const cover = track.coverDataUri
    ? `<g clip-path="url(#artClip)"><g transform="rotate(${spin} ${art.x.toFixed(1)} ${art.y.toFixed(1)})">
        <image href="${track.coverDataUri}" x="${(art.x - inner * 1.0).toFixed(1)}" y="${(art.y - inner).toFixed(1)}" width="${(inner * 2).toFixed(1)}" height="${(inner * 2).toFixed(1)}" preserveAspectRatio="xMidYMid slice"/>
      </g></g>
      <circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${(inner * 0.13).toFixed(1)}" fill="#ffffff" opacity="0.92"/>
      <circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${(inner * 0.035).toFixed(1)}" fill="${st.shadow}"/>`
    : `<circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${inner.toFixed(1)}" fill="#ffffff" opacity="0.25"/>`;

  // Bubbles orbiting the record: behind it on the far side, in front on the near side.
  const orbiters = scene.orbit.map((o) => {
    const a = TAU * (o.start + o.dir * p);
    const x = art.x + o.rx * Math.cos(a);
    const y = art.y + o.ry * Math.sin(a) - 30;
    const s = o.size * (0.85 + 0.15 * Math.sin(a));
    return { front: Math.sin(a) > 0, svg: bubble(x, y, s) };
  });

  // Bubble equalizer: whole cycles per loop, so it joins up seamlessly.
  const eq = [0, 1, 2, 3, 4].map((i) => {
    const h = 0.25 + 0.75 * (0.5 + 0.5 * wave(p, 2 + (i % 3), scene.ph + i * 0.21)) * (0.6 + 0.4 * (0.5 + 0.5 * wave(p, 1, i * 0.37)));
    const bh = 18 + 92 * h;
    const x = 760 + i * 34;
    return `<rect x="${x}" y="${(1440 - bh).toFixed(1)}" width="22" height="${bh.toFixed(1)}" rx="11" fill="${i % 2 ? '#ff7fc8' : '#9b6bff'}"/>
      <circle cx="${x + 11}" cy="${(1440 - bh - 20).toFixed(1)}" r="9" fill="url(#iri)"/>`;
  }).join('');

  // A little bubble progress bar that fills over the loop.
  const dots = 12;
  const lit = p * dots;
  const progress = Array.from({ length: dots }, (_, i) => {
    const on = Math.max(0, Math.min(1, lit - i));
    return `<circle cx="${140 + i * 44}" cy="1476" r="${(8 + 4 * on).toFixed(1)}" fill="#ffffff" opacity="${(0.35 + 0.6 * on).toFixed(2)}"/>`;
  }).join('');

  const t = R.fit(track.title, 600, 62, 38, 0.56);
  const a = R.fit(track.artist, 600, 44, 30, 0.52);
  const dayStr = String(track.day).padStart(3, '0');
  const [hx, hy] = scene.heart;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${RW}" height="${RH}" viewBox="0 0 ${RW} ${RH}">
  <defs>${DEFS}
    <linearGradient id="reelBg" x1="0" y1="0" x2="${st.vertical ? 0 : 1}" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <clipPath id="artClip"><circle cx="${art.x.toFixed(1)}" cy="${art.y.toFixed(1)}" r="${inner.toFixed(1)}"/></clipPath>
  </defs>
  <rect width="${RW}" height="${RH}" fill="url(#reelBg)"/>
  ${st.blobs.map(([col, x, y, rad, op], i) => glow(col, x + 60 * slow(p, 2, i * 0.37), y + 60 * slow(p, 2, i * 0.37 + 0.25), rad, op)).join('')}
  ${R.stars((track.day || 0) * 7 + 3, p, sp, 90, RW, RH)}
  ${R.planet(880, 1650, 40, sp)}
  ${R.risers((track.day || 0) * 13 + 5, p, 6, RW, RH)}
  ${orbiters.filter((o) => !o.front).map((o) => o.svg).join('')}
  ${R.shadow(art.x, scene.art.y + AR + 50, AR * 0.7 * (1 - 0.05 * R.bob(scene.art, p)), 42)}
  ${cover}
  ${art.svg}
  ${orbiters.filter((o) => o.front).map((o) => o.svg).join('')}
  ${R.floating(scene.a, p).svg}
  ${R.floating(scene.b, p).svg}
  ${icon(HEART, hx, hy + 12 * wave(p, 1, scene.ph), 110, st.heart, -12 + 6 * wave(p, 1, scene.ph + 0.1))}
  ${R.twinkle(SPARK, 860, 1250, 76, '#fff6b0', p, scene.ph + 0.3)}
  ${R.twinkle(SPARK, 940, 470, 40, '#ffffff', p, scene.ph + 0.6)}

  <rect x="64" y="214" width="300" height="84" rx="42" fill="#ff7fc8"/>
  <rect x="64" y="200" width="300" height="84" rx="42" fill="#ffffff" opacity="0.92"/>
  <text x="214" y="258" text-anchor="middle" font-family="Bagel Fat One" font-size="44" fill="#5a1a9c">bubble fm</text>
  <rect x="${RW - 64 - 230}" y="200" width="230" height="84" rx="42" fill="#ffffff" opacity="0.92"/>
  <text x="${RW - 64 - 115}" y="256" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="40" fill="#5a1a9c">day ${dayStr}</text>
  ${stickerText(st.label, 64, 440, 112, { top: st.labelTop, layers: st.labelLayers, step: 7 })}

  <rect x="64" y="1288" width="${RW - 128}" height="240" rx="52" fill="${st.shadow}"/>
  <rect x="64" y="1270" width="${RW - 128}" height="240" rx="52" fill="#ffffff" opacity="0.95"/>
  <text x="112" y="1356" font-family="Fredoka" font-weight="700" font-size="${t.size}" fill="#3a1062">${esc(t.text)}</text>
  <text x="112" y="1420" font-family="Fredoka" font-weight="500" font-size="${a.size}" fill="#5a2a8a">${esc(a.text)}</text>
  ${eq}
  <g opacity="0.9">${progress.replace(/fill="#ffffff"/g, `fill="${st.shadow}"`)}</g>
  ${stickerText('music to fall in love to', 72, 1600, 44, { family: 'Fredoka', weight: 700, layers: ['#5a1a9c'], step: 4 })}
</svg>`;
}

// Returns { still, video } for the day's track.
async function renderReel(track, { animate = true } = {}) {
  const scene = reelScene(track);
  const still = await R.toJpeg(reelSvg(track, 0, scene), RW);
  const video = animate ? await R.toVideo((p) => reelSvg(track, p, scene), RW, RH) : null;
  return { still, video };
}

module.exports = { renderReel, reelSvg, RW, RH };
