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

async function downloadAsDataUri(url) {
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const type = res.headers.get('content-type') || 'image/jpeg';
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`;
}

module.exports = { getToken, getPlaylistTracks, downloadAsDataUri, playlistId };
