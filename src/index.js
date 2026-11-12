// Bubble FM daily post.
//   node src/index.js prepare   pick the next track on each playlist and render the carousel
//   node src/index.js publish   post the prepared carousel to Instagram and record it
// Set SAMPLE=true to try the templates without Spotify.
const fs = require('fs');
const path = require('path');
const { renderPost } = require('./render');
const spotify = require('./spotify');
const instagram = require('./instagram');
const { sampleTracks } = require('./sample');

const ROOT = path.join(__dirname, '..');
const STATE_FILE = path.join(ROOT, 'state.json');
const POSTS_DIR = path.join(ROOT, 'posts');
const PLAYLISTS = ['breakfast', 'boogie', 'datenight'];
const ENV_NAME = { breakfast: 'PLAYLIST_BREAKFAST', boogie: 'PLAYLIST_BOOGIE', datenight: 'PLAYLIST_DATENIGHT' };
const LABEL = { breakfast: 'breakfast', boogie: 'boogie', datenight: 'date night' };

const env = (name, required = true) => {
  const v = process.env[name];
  if (required && !v) throw new Error(`Missing setting ${name}. Add it as a GitHub secret (see README).`);
  return v;
};

function loadState() {
  if (!fs.existsSync(STATE_FILE)) return { day: 0, posted: { breakfast: [], boogie: [], datenight: [] }, history: [] };
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: process.env.TZ_NAME || 'Europe/Berlin' }).format(new Date());

function buildCaption(day, tracks) {
  const lines = [
    `day ${String(day).padStart(3, '0')} · music to fall in love to`,
    '',
    ...tracks.map((t) => `${LABEL[t.playlist]} · ${t.artist} – ${t.title}`),
    '',
    'All three are in the playlists, link in bio.',
    '',
    '#bubblefm #musictofallinloveto',
  ];
  return lines.join('\n');
}

async function pickTracks(state) {
  if (process.env.SAMPLE === 'true') return sampleTracks();
  const token = await spotify.getToken(env('SPOTIFY_CLIENT_ID'), env('SPOTIFY_CLIENT_SECRET'));
  const picked = [];
  for (const p of PLAYLISTS) {
    const all = await spotify.getPlaylistTracks(token, env(ENV_NAME[p]));
    const done = new Set(state.posted[p] || []);
    const next = all.find((t) => !done.has(t.id));
    if (!next) {
      throw new Error(`The ${LABEL[p]} playlist has no tracks left that weren't posted yet. Add new songs to it.`);
    }
    picked.push({ ...next, playlist: p, coverDataUri: await spotify.downloadAsDataUri(next.coverUrl) });
  }
  return picked;
}

async function prepare() {
  const state = loadState();
  const date = today();
  const dir = path.join(POSTS_DIR, date);
  if (fs.existsSync(path.join(dir, 'post.json')) && process.env.FORCE !== 'true') {
    console.log(`A post for ${date} is already prepared in posts/${date}. Set FORCE=true to make it again.`);
    return;
  }
  const day = state.day + 1;
  const tracks = await pickTracks(state);
  const slides = await renderPost(day, tracks);
  fs.mkdirSync(dir, { recursive: true });
  slides.forEach((buf, i) => fs.writeFileSync(path.join(dir, `${i + 1}.jpg`), buf));
  const caption = buildCaption(day, tracks);
  fs.writeFileSync(path.join(dir, 'caption.txt'), caption + '\n');
  const meta = {
    date,
    day,
    published: false,
    tracks: tracks.map(({ coverDataUri, ...t }) => t),
    files: slides.map((_, i) => `${i + 1}.jpg`),
  };
  fs.writeFileSync(path.join(dir, 'post.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`Prepared day ${day} in posts/${date}:\n\n${caption}`);
}

async function publish() {
  const date = today();
  const dir = path.join(POSTS_DIR, date);
  const metaFile = path.join(dir, 'post.json');
  if (!fs.existsSync(metaFile)) throw new Error(`Nothing prepared for ${date}. Run prepare first.`);
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  if (meta.published) {
    console.log(`Day ${meta.day} was already posted (${meta.instagramId}).`);
    return;
  }
  let postId = null;
  if (process.env.MODE !== 'manual') {
    const repo = env('GITHUB_REPOSITORY');
    const sha = env('PUBLISH_SHA');
    const imageUrls = meta.files.map(
      (f) => `https://raw.githubusercontent.com/${repo}/${sha}/posts/${date}/${f}`
    );
    const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
    postId = await instagram.publishCarousel({
      userId: env('IG_USER_ID'),
      token: env('IG_ACCESS_TOKEN'),
      imageUrls,
      caption,
    });
  }

  const state = loadState();
  state.day = meta.day;
  for (const t of meta.tracks) {
    if (t.id && !t.id.startsWith('sample-')) (state.posted[t.playlist] ||= []).push(t.id);
  }
  state.history.push({ date, day: meta.day, instagramId: postId, tracks: meta.tracks.map((t) => `${t.artist} – ${t.title}`) });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
  meta.published = true;
  meta.instagramId = postId;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2) + '\n');
  console.log(
    postId
      ? `Posted day ${meta.day} to Instagram (${postId}).`
      : `Saved day ${meta.day} as used. Download the images from this run and post them yourself.`
  );
}

async function refresh() {
  const { access_token: token, expires_in: secs } = await instagram.refreshToken(env('IG_ACCESS_TOKEN'));
  fs.writeFileSync(path.join(ROOT, '.new-token'), token);
  console.log(`Got a fresh Instagram token, valid for ${Math.round(secs / 86400)} days.`);
}

const cmd = process.argv[2];
const run = { prepare, publish, refresh }[cmd];
if (!run) {
  console.error('Usage: node src/index.js prepare|publish|refresh');
  process.exit(1);
}
run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
