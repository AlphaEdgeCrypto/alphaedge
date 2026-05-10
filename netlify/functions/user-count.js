// Fetches real user count from Netlify Identity
// Requires NETLIFY_API_TOKEN env var
const crypto = require('crypto');

exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;

  // Check what Identity-related env vars Netlify auto-injects
  const identityKeys = Object.keys(process.env)
    .filter(k => /identity|jwt|secret|gotrue/i.test(k))
    .sort();

  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token', identityKeys }) };
  }

  const SITE_ID     = '93eefe77-7d79-4fcd-a351-e1452665c0f9';
  const SITE_URL    = 'https://majestic-maamoul-22e146.netlify.app';

  try {
    // Try: Netlify Identity instance endpoint (different from /identity/users)
    const r1 = await fetch(
      `https://api.netlify.com/api/v1/sites/${SITE_ID}/identity`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const identityCfg = await r1.json();

    // Try: get JWT secret to call GoTrue directly
    const jwtSecret = identityCfg.jwt_secret
      || identityCfg.secret
      || process.env.JWT_SECRET
      || process.env.NETLIFY_JWT_SECRET
      || process.env.NETLIFY_IDENTITY_TOKEN;

    if (jwtSecret) {
      // Build a service-role JWT
      const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const p = Buffer.from(JSON.stringify({
        sub: '0', role: 'service_role', iss: 'netlify',
        exp: Math.floor(Date.now() / 1000) + 300,
        iat: Math.floor(Date.now() / 1000),
      })).toString('base64url');
      const sig = crypto.createHmac('sha256', jwtSecret).update(`${h}.${p}`).digest('base64url');
      const adminJWT = `${h}.${p}.${sig}`;

      const ur = await fetch(`${SITE_URL}/.netlify/identity/admin/users?per_page=1`, {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });
      const ud = await ur.json();
      const total = ud.total_count ?? ud.total ?? (Array.isArray(ud.users) ? ud.users.length : null);

      if (total != null) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ count: total }),
        };
      }
    }

    // Debug: show what we got
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        count: 0,
        identityKeys,
        identityCfgKeys: Object.keys(identityCfg),
        identityCfgStatus: r1.status,
        hasJwtSecret: !!jwtSecret,
        identityCfgSample: JSON.stringify(identityCfg).slice(0, 400),
      }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message, identityKeys }) };
  }
};
