// A realistic vinyl record (and optional sleeve and tonearm) as SVG, for the Reel.
// The reflections stay put while the record turns underneath them, like light on real vinyl.

function grooves(cx, cy, rIn, rOut) {
  let s = '';
  for (let r = rIn; r < rOut; r += 3.2) {
    const o = 0.025 + 0.025 * Math.abs(Math.sin(r * 0.37));
    s += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="${o.toFixed(3)}" stroke-width="1"/>`;
  }
  // Gaps between the songs on the side.
  for (const f of [0.32, 0.55, 0.74]) {
    const r = rIn + (rOut - rIn) * f;
    s += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#000" stroke-opacity="0.7" stroke-width="3"/>
      <circle cx="${cx}" cy="${cy}" r="${(r + 2.5).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="1"/>`;
  }
  return s;
}

function wedge(cx, cy, R, angle, spread) {
  const a0 = ((angle - spread) * Math.PI) / 180;
  const a1 = ((angle + spread) * Math.PI) / 180;
  return `M${cx} ${cy} L${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)} A${R} ${R} 0 0 1 ${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)} Z`;
}

// id must be unique per record in the document.
function vinylSvg({ id = 'v', cx, cy, R, rotation = 0, artHref, holeColor = '#000', labelColor = '#f3efe6' }) {
  const rl = R * 0.34;
  return `<defs>
    <radialGradient id="${id}Disc" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#1c1b20"/><stop offset="0.92" stop-color="#0d0c10"/><stop offset="1" stop-color="#232228"/></radialGradient>
    <radialGradient id="${id}Sheen" cx="0.5" cy="0.5" r="0.5"><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.65" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0.05"/></radialGradient>
    <filter id="${id}Soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${(R * 0.05).toFixed(1)}"/></filter>
    <filter id="${id}Shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(R * 0.06).toFixed(1)}"/></filter>
    <clipPath id="${id}Clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <clipPath id="${id}Label"><circle cx="${cx}" cy="${cy}" r="${rl.toFixed(1)}"/></clipPath>
  </defs>
  <ellipse cx="${cx + R * 0.05}" cy="${cy + R * 0.09}" rx="${R * 0.98}" ry="${R * 0.98}" fill="#1a0533" opacity="0.45" filter="url(#${id}Shadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}Disc)"/>
  <g transform="rotate(${rotation.toFixed(2)} ${cx} ${cy})">
    ${grooves(cx, cy, rl + R * 0.06, R * 0.96)}
    <circle cx="${cx}" cy="${cy}" r="${rl.toFixed(1)}" fill="${labelColor}"/>
    ${artHref ? `<image href="${artHref}" x="${(cx - rl).toFixed(1)}" y="${(cy - rl).toFixed(1)}" width="${(rl * 2).toFixed(1)}" height="${(rl * 2).toFixed(1)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id}Label)"/>` : ''}
  </g>
  <circle cx="${cx}" cy="${cy}" r="${rl.toFixed(1)}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${(rl + R * 0.03).toFixed(1)}" fill="none" stroke="#fff" stroke-opacity="0.08" stroke-width="${(R * 0.02).toFixed(1)}"/>
  <g clip-path="url(#${id}Clip)" filter="url(#${id}Soft)">
    <path d="${wedge(cx, cy, R, -50, 14)}" fill="url(#${id}Sheen)"/>
    <path d="${wedge(cx, cy, R, 130, 14)}" fill="url(#${id}Sheen)"/>
    <path d="${wedge(cx, cy, R, 30, 5)}" fill="url(#${id}Sheen)" opacity="0.5"/>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R - 1.5}" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${(R * 0.022).toFixed(1)}" fill="${holeColor}"/>
  <circle cx="${cx}" cy="${cy}" r="${(R * 0.022).toFixed(1)}" fill="none" stroke="#000" stroke-opacity="0.4" stroke-width="2"/>`;
}

// Square record sleeve with the cover art, a paper edge and a soft shadow.
function sleeveSvg({ id = 's', x, y, size, rotate = 0, artHref }) {
  const c = `${x + size / 2} ${y + size / 2}`;
  return `<defs>
    <filter id="${id}Shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${(size * 0.035).toFixed(1)}"/></filter>
    <linearGradient id="${id}Gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.18"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient>
  </defs>
  <g transform="rotate(${rotate} ${c})">
    <rect x="${x + size * 0.03}" y="${y + size * 0.06}" width="${size}" height="${size}" fill="#1a0533" opacity="0.45" filter="url(#${id}Shadow)"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="#f4f1ea"/>
    <image href="${artHref}" x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice"/>
    <rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#${id}Gloss)"/>
    <rect x="${x + 0.75}" y="${y + 0.75}" width="${size - 1.5}" height="${size - 1.5}" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="1.5"/>
  </g>`;
}

// Simple chrome tonearm resting on the record. base = pivot point, tip = where the needle sits.
function tonearmSvg({ id = 't', bx, by, tx, ty, scale = 1 }) {
  const s = scale;
  const ang = (Math.atan2(ty - by, tx - bx) * 180) / Math.PI;
  return `<defs>
    <linearGradient id="${id}Chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafafa"/><stop offset="0.45" stop-color="#b9bcc4"/><stop offset="0.55" stop-color="#8d909a"/><stop offset="1" stop-color="#e8e9ee"/></linearGradient>
    <radialGradient id="${id}Base" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#b8bbc3"/><stop offset="1" stop-color="#6d707a"/></radialGradient>
    <filter id="${id}Shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${8 * s}"/></filter>
  </defs>
  <g opacity="0.45" filter="url(#${id}Shadow)" transform="translate(${14 * s} ${22 * s})">
    <line x1="${bx}" y1="${by}" x2="${tx}" y2="${ty}" stroke="#1a0533" stroke-width="${16 * s}" stroke-linecap="round"/>
  </g>
  <circle cx="${bx}" cy="${by}" r="${62 * s}" fill="url(#${id}Base)"/>
  <circle cx="${bx}" cy="${by}" r="${38 * s}" fill="#2a2a30"/>
  <circle cx="${bx}" cy="${by}" r="${22 * s}" fill="url(#${id}Base)"/>
  <g transform="rotate(${ang.toFixed(2)} ${bx} ${by})">
    <rect x="${bx - 70 * s}" y="${by - 16 * s}" width="${50 * s}" height="${32 * s}" rx="${8 * s}" fill="#2a2a30"/>
    <rect x="${bx}" y="${by - 7 * s}" width="${Math.hypot(tx - bx, ty - by) - 40 * s}" height="${14 * s}" rx="${7 * s}" fill="url(#${id}Chrome)"/>
  </g>
  <g transform="rotate(${(ang + 25).toFixed(2)} ${tx} ${ty})">
    <rect x="${tx - 46 * s}" y="${ty - 18 * s}" width="${64 * s}" height="${36 * s}" rx="${6 * s}" fill="#24242a"/>
    <rect x="${tx - 44 * s}" y="${ty - 16 * s}" width="${60 * s}" height="${8 * s}" rx="${4 * s}" fill="#fff" opacity="0.18"/>
  </g>`;
}

module.exports = { vinylSvg, sleeveSvg, tonearmSvg };
