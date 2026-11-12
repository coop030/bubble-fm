// Reads the three Bubble FM playlists from the Spotify Web API (client credentials flow).
const API = 'https://api.spotify.com/v1';

async function getToken(clientId, clientSecret) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`Spotify login failed (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

// Accepts a bare playlist ID or a full open.spotify.com link.
function playlistId(value) {
  const m = String(value).match(/playlist[/:]([A-Za-z0-9]+)/);
  return m ? m[1] : String(value).trim();
}

async function getPlaylistTracks(token, playlist) {
  const id = playlistId(playlist);
  const tracks = [];
  let url = `${API}/playlists/${id}/tracks?limit=100&fields=next,items(added_at,track(id,name,artists(name),album(images),external_urls,is_local))`;
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Could not read playlist ${id} (${res.status}): ${await res.text()}`);
    const page = await res.json();
    for (const item of page.items) {
      const t = item.track;
      if (!t || !t.id || t.is_local) continue;
      tracks.push({
        id: t.id,
        title: t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        url: t.external_urls?.spotify,
        coverUrl: (t.album?.images || [])[0]?.url || null,
      });
    }
    url = page.next;
  }
  return tracks;
}

// Fallback without Spotify keys: reads the public playlist embed page and each track's oEmbed
// for its cover. Works only for public playlists and may break if Spotify changes the page.
function findTrackList(node) {
  if (Array.isArray(node)) {
    if (node.length && node.every((t) => t && typeof t.uri === 'string' && t.uri.startsWith('spotify:'))) return node;
    for (const n of node) {
      const r = findTrackList(n);
      if (r) return r;
    }
  } else if (node && typeof node === 'object') {
    if (Array.isArray(node.trackList)) return node.trackList;
    for (const v of Object.values(node)) {
      const r = findTrackList(v);
      if (r) return r;
    }
  }
  return null;
}

async function getPublicPlaylistTracks(playlist) {
  const id = playlistId(playlist);
  const res = await fetch(`https://open.spotify.com/embed/playlist/${id}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (bubble-fm)' },
  });
  if (!res.ok) throw new Error(`Could not open playlist ${id} (${res.status}). Is it public?`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!m) throw new Error(`Could not read playlist ${id}: Spotify's page looks different. Add the Spotify keys instead.`);
  const list = findTrackList(JSON.parse(m[1])) || [];
  const tracks = [];
  for (const t of list) {
    if (!String(t.uri).startsWith('spotify:track:')) continue;
    const trackId = t.uri.split(':')[2];
    let coverUrl = null;
    try {
      const o = await (await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`)).json();
      // Swap the 300px image code for the 640px one.
      coverUrl = o.thumbnail_url ? o.thumbnail_url.replace('ab67616d00001e02', 'ab67616d0000b273') : null;
    } catch {
      coverUrl = null;
    }
    tracks.push({
      id: trackId,
      title: t.title,
      artist: String(t.subtitle || '').replace(/\s*,\s*/g, ', '),
      url: `https://open.spotify.com/track/${trackId}`,
      coverUrl,
    });
  }
  if (!tracks.length) throw new Error(`Playlist ${id} looks empty or private.`);
  return tracks;
}

async function downloadAsDataUri(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || 'image/jpeg';
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
}

module.exports = { getToken, getPlaylistTracks, getPublicPlaylistTracks, downloadAsDataUri, playlistId };
