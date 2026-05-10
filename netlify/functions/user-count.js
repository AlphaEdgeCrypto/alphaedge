// Fetches real user count from Netlify Identity
// Requires NETLIFY_API_TOKEN env var
const crypto = require('crypto');

exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token' }) };
  }

  const SITE_ID      = '93eefe77-7d79-4fcd-a351-e1452665c0f9';
  const INSTANCE_ID  = '69fd9e6303f7b0bb01764e3f';
  const SITE_URL     = 'https://majestic-maamoul-22e146.netlify.app';

  try {
    // Step 1: get JWT secret from the Identity instance config
    const cfgR = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const cfg = await cfgR.json();

    // The JWT secret is in cfg.jwt_secret (or similar)
    const jwtSecret = cfg.jwt_secret || cfg.secret;

    if (!jwtSecret) {
      // Fallback: try direct identity instance endpoint
      const inst = await fetch(
        `https://api.netlify.com/api/v1/identity/instances/${INSTANCE_ID}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json()).catch(() => ({}));

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          count: 0,
          reason: 'no_jwt_secret',
          cfg_keys: Object.keys(cfg),
          cfg_status: cfgR.status,
          inst_keys: Object.keys(inst),
          cfg_sample: JSON.stringify(cfg).slice(0, 300),
        }),
      };
    }

    // Step 2: sign an admin JWT with the secret
    function makeJWT(secret) {
      const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const p = Buffer.from(JSON.stringify({
        sub: '0', role: 'service_role', iss: 'netlify',
        exp: Math.floor(Date.now() / 1000) + 300,
        iat: Math.floor(Date.now() / 1000),
      })).toString('base64url');
      const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
      return `${h}.${p}.${sig}`;
    }
    const adminJWT = makeJWT(jwtSecret);

    // Step 3: list users
    let page = 0, total = 0;
    while (true) {
      const r = await fetch(
        `${SITE_URL}/.netlify/identity/admin/users?per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${adminJWT}` } }
      );
      const d = await r.json();
      const users = Array.isArray(d.users) ? d.users : (Array.isArray(d) ? d : []);
      total += users.length;
      if (users.length < 100) break;
      page++;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ count: total }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
