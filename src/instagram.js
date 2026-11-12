// Publishes a carousel through the Instagram API. New Meta apps use the Facebook Graph host
// with a system user token (never expires); set IG_GRAPH_HOST=graph.instagram.com for an
// Instagram-login token instead.
const VERSION = process.env.IG_GRAPH_VERSION || 'v23.0';
const HOST = process.env.IG_GRAPH_HOST || 'graph.facebook.com';
const BASE = `https://${HOST}/${VERSION}`;

async function call(method, path, params) {
  const url = new URL(`${BASE}/${path}`);
  const opts = { method };
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    opts.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    opts.body = new URLSearchParams(params).toString();
  }
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    throw new Error(`Instagram ${path} failed (${res.status}): ${JSON.stringify(body.error || body)}`);
  }
  return body;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Instagram processes each uploaded image before it can be published.
async function waitUntilReady(id, token) {
  // Videos can take a few minutes to process; give up after about ten.
  for (let i = 0; i < 120; i++) {
    const { status_code: status } = await call('GET', id, { fields: 'status_code', access_token: token });
    if (status === 'FINISHED') return;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`Instagram could not process ${id} (${status})`);
    await sleep(5000);
  }
  throw new Error(`Instagram took too long to process ${id}`);
}

// items: [{ url, video, tags }] — images must be JPEG, videos MP4, tags are Instagram usernames.
async function publishCarousel({ userId, token, items, caption }) {
  const children = [];
  for (const item of items) {
    const params = item.video
      ? { media_type: 'VIDEO', video_url: item.url }
      : { image_url: item.url };
    const base = { ...params, is_carousel_item: 'true', access_token: token };
    let id;
    if (item.tags && item.tags.length) {
      // Video tags have no position; image tags sit in the middle of the slide.
      const userTags = item.tags.map((username) => (item.video ? { username } : { username, x: 0.5, y: 0.5 }));
      try {
        ({ id } = await call('POST', `${userId}/media`, { ...base, user_tags: JSON.stringify(userTags) }));
        console.log(`Tagged ${item.tags.map((t) => '@' + t).join(', ')}.`);
      } catch (err) {
        // A tag can fail (private account, renamed handle, unsupported here). Post the slide anyway.
        console.log(`Could not tag ${item.tags.join(', ')}: ${err.message}. Posting this slide without the tag.`);
      }
    }
    if (!id) ({ id } = await call('POST', `${userId}/media`, base));
    children.push(id);
  }
  for (const id of children) await waitUntilReady(id, token);
  const { id: carouselId } = await call('POST', `${userId}/media`, {
    media_type: 'CAROUSEL',
    children: children.join(','),
    caption,
    access_token: token,
  });
  await waitUntilReady(carouselId, token);
  const { id: postId } = await call('POST', `${userId}/media_publish`, {
    creation_id: carouselId,
    access_token: token,
  });
  return postId;
}

// Long-lived tokens last 60 days; refreshing returns a new 60-day token.
async function refreshToken(token) {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`
  );
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`Token refresh failed: ${JSON.stringify(body.error || body)}`);
  return body;
}

module.exports = { publishCarousel, refreshToken };
