// Placeholder tracks so the templates can be tried before Spotify is connected.
const sharp = require('sharp');

async function fakeCover(c1, c2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect width="640" height="640" fill="url(#g)"/><circle cx="320" cy="320" r="110" fill="#fff" opacity="0.35"/></svg>`;
  const jpg = await sharp(Buffer.from(svg)).jpeg().toBuffer();
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
}

async function sampleTracks() {
  return [
    { id: 'sample-1', playlist: 'breakfast', title: '[Breakfast track]', artist: '[Artist]', coverDataUri: await fakeCover('#f4a261', '#e76f51') },
    { id: 'sample-2', playlist: 'boogie', title: '[Boogie track]', artist: '[Artist]', coverDataUri: await fakeCover('#2a9d8f', '#264653') },
    { id: 'sample-3', playlist: 'datenight', title: '[Date night track]', artist: '[Artist]', coverDataUri: await fakeCover('#6d597a', '#b56576') },
  ];
}

module.exports = { sampleTracks };
