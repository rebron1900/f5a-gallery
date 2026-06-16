export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // 处理 OAuth 回调
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');

      if (!code) {
        return new Response('Missing code parameter', { status: 400 });
      }

      // POST 请求：前端 JS 用 code 换 token（fetch 模式）
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code: body.code || code,
            }),
          });
          const tokenData = await tokenResponse.json();
          return new Response(JSON.stringify(tokenData), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      }

      // GET 请求：GitHub 直接回调，用 code 换 token 后跳回原站
      try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });
        const tokenData = await tokenResponse.json();

        if (tokenData.access_token) {
          // 跳回原站，把 token 放在 hash 里（不会发送到服务器）
          const redirectUrl = 'https://rebron1900.github.io/f5a-gallery/#token=' + encodeURIComponent(tokenData.access_token);
          return Response.redirect(redirectUrl, 302);
        } else {
          return new Response('Token exchange failed: ' + JSON.stringify(tokenData), { status: 400 });
        }
      } catch (e) {
        return new Response('Error: ' + e.message, { status: 500 });
      }
    }

    // 健康检查
    return new Response('OK', { status: 200 });
  },
};
