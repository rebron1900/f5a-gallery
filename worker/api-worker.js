/**
 * f5a-gallery Cloudflare Worker — Likes & Favorites API
 *
 * KV Bindings required:
 *   REACTIONS_KV — Cloudflare KV namespace
 *
 * Environment variables:
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 */

const ALLOWED_ORIGINS = [
  'https://rebron1900.github.io',
];

function corsHeaders(origin) {
  const h = { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
  if (ALLOWED_ORIGINS.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  return h;
}

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Verify GitHub token and return user info
async function getUser(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github+json', 'User-Agent': 'f5a-gallery' },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return { id: user.id, login: user.login, avatar: user.avatar_url };
  } catch { return null; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // ===== OAuth callback (existing) =====
    if (path === '/callback' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      if (!code) return new Response('Missing code', { status: 400 });
      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) return new Response('Authorization failed', { status: 400 });
        const hash = state ? `#token=${tokenData.access_token}&state=${state}` : `#token=${tokenData.access_token}`;
        return Response.redirect(`https://rebron1900.github.io/f5a-gallery/${hash}`, 302);
      } catch { return new Response('Service unavailable', { status: 502 }); }
    }

    // POST /callback — frontend JS exchanges code for token via fetch
    if (path === '/callback' && request.method === 'POST') {
      try {
        const body = await request.json();
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: body.code,
          }),
        });
        const tokenData = await tokenRes.json();
        return json(tokenData, origin);
      } catch (e) {
        return json({ error: e.message }, origin, 500);
      }
    }

    // ===== API Routes =====

    // GET /api/reactions/:slug — get counts + current user state
    if (path.startsWith('/api/reactions/') && request.method === 'GET') {
      const slug = path.split('/api/reactions/')[1];
      if (!slug) return json({ error: 'Missing slug' }, origin, 400);

      const likes = parseInt(await env.REACTIONS_KV.get(`likes:${slug}`) || '0');
      const favorites = parseInt(await env.REACTIONS_KV.get(`favorites:${slug}`) || '0');

      // Check user state if token provided
      let userLiked = false, userFavorited = false;
      const auth = request.headers.get('Authorization');
      if (auth && auth.startsWith('token ')) {
        const user = await getUser(auth.substring(6));
        if (user) {
          const userLikes = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:likes`) || '[]');
          const userFavs = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:favorites`) || '[]');
          userLiked = userLikes.includes(slug);
          userFavorited = userFavs.includes(slug);
        }
      }

      return json({ likes, favorites, userLiked, userFavorited }, origin);
    }

    // GET /api/reactions — bulk get for all slugs
    if (path === '/api/reactions' && request.method === 'GET') {
      const slugsParam = url.searchParams.get('slugs');
      if (!slugsParam) return json({ error: 'Missing slugs' }, origin, 400);
      const slugs = slugsParam.split(',');

      const result = {};
      for (const slug of slugs) {
        const likes = parseInt(await env.REACTIONS_KV.get(`likes:${slug}`) || '0');
        const favorites = parseInt(await env.REACTIONS_KV.get(`favorites:${slug}`) || '0');
        result[slug] = { likes, favorites };
      }

      // Check user state if token provided
      const auth = request.headers.get('Authorization');
      if (auth && auth.startsWith('token ')) {
        const user = await getUser(auth.substring(6));
        if (user) {
          const userLikes = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:likes`) || '[]');
          const userFavs = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:favorites`) || '[]');
          for (const slug of slugs) {
            if (result[slug]) {
              result[slug].userLiked = userLikes.includes(slug);
              result[slug].userFavorited = userFavs.includes(slug);
            }
          }
        }
      }

      return json(result, origin);
    }

    // POST /api/likes/:slug/toggle — toggle like
    if (path.match(/^\/api\/likes\/.+\/toggle$/) && request.method === 'POST') {
      const slug = path.split('/api/likes/')[1].replace('/toggle', '');
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('token ')) return json({ error: 'Unauthorized' }, origin, 401);

      const user = await getUser(auth.substring(6));
      if (!user) return json({ error: 'Invalid token' }, origin, 401);

      // Rate limit: max one toggle per second per user
      const rateKey = `ratelimit:${user.id}`;
      const lastToggle = parseInt(await env.REACTIONS_KV.get(rateKey) || '0');
      const now = Date.now();
      if (lastToggle && now - lastToggle < 1000) {
        return json({ error: 'Rate limited. Please wait before toggling again.' }, origin, 429);
      }

      const key = `likes:${slug}`;
      const userKey = `user:${user.id}:likes`;
      const userLikes = JSON.parse(await env.REACTIONS_KV.get(userKey) || '[]');
      const idx = userLikes.indexOf(slug);

      let liked;
      if (idx >= 0) {
        // Unlike
        userLikes.splice(idx, 1);
        const count = Math.max(0, parseInt(await env.REACTIONS_KV.get(key) || '0') - 1);
        await env.REACTIONS_KV.put(key, String(count));
        liked = false;
      } else {
        // Like
        userLikes.push(slug);
        const count = parseInt(await env.REACTIONS_KV.get(key) || '0') + 1;
        await env.REACTIONS_KV.put(key, String(count));
        liked = true;
      }
      await env.REACTIONS_KV.put(userKey, JSON.stringify(userLikes));

      const count = parseInt(await env.REACTIONS_KV.get(key) || '0');
      await env.REACTIONS_KV.put(rateKey, String(now));
      return json({ liked, count }, origin);
    }

    // POST /api/favorites/:slug/toggle — toggle favorite
    if (path.match(/^\/api\/favorites\/.+\/toggle$/) && request.method === 'POST') {
      const slug = path.split('/api/favorites/')[1].replace('/toggle', '');
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('token ')) return json({ error: 'Unauthorized' }, origin, 401);

      const user = await getUser(auth.substring(6));
      if (!user) return json({ error: 'Invalid token' }, origin, 401);

      // Rate limit: max one toggle per second per user
      const rateKey = `ratelimit:${user.id}`;
      const lastToggle = parseInt(await env.REACTIONS_KV.get(rateKey) || '0');
      const now = Date.now();
      if (lastToggle && now - lastToggle < 1000) {
        return json({ error: 'Rate limited. Please wait before toggling again.' }, origin, 429);
      }

      const key = `favorites:${slug}`;
      const userKey = `user:${user.id}:favorites`;
      const userFavs = JSON.parse(await env.REACTIONS_KV.get(userKey) || '[]');
      const idx = userFavs.indexOf(slug);

      let favorited;
      if (idx >= 0) {
        userFavs.splice(idx, 1);
        const count = Math.max(0, parseInt(await env.REACTIONS_KV.get(key) || '0') - 1);
        await env.REACTIONS_KV.put(key, String(count));
        favorited = false;
      } else {
        userFavs.push(slug);
        const count = parseInt(await env.REACTIONS_KV.get(key) || '0') + 1;
        await env.REACTIONS_KV.put(key, String(count));
        favorited = true;
      }
      await env.REACTIONS_KV.put(userKey, JSON.stringify(userFavs));

      const count = parseInt(await env.REACTIONS_KV.get(key) || '0');
      await env.REACTIONS_KV.put(rateKey, String(now));
      return json({ favorited, count }, origin);
    }

    // GET /api/user/reactions — get all user's likes + favorites
    if (path === '/api/user/reactions' && request.method === 'GET') {
      const auth = request.headers.get('Authorization');
      if (!auth || !auth.startsWith('token ')) return json({ error: 'Unauthorized' }, origin, 401);

      const user = await getUser(auth.substring(6));
      if (!user) return json({ error: 'Invalid token' }, origin, 401);

      const likes = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:likes`) || '[]');
      const favorites = JSON.parse(await env.REACTIONS_KV.get(`user:${user.id}:favorites`) || '[]');

      return json({ likes, favorites, user: { login: user.login, avatar: user.avatar } }, origin);
    }

    // Health check
    if (path === '/' || path === '/health') {
      return new Response('OK', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  },
};
