// Fetches real user count from Netlify Identity admin API
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;

  // DEBUG: show which relevant env vars exist (not their values)
  const debugKeys = Object.keys(process.env)
    .filter(k => k.toLowerCase().includes('netlify') || k.toLowerCase().includes('token') || k.toLowerCase().includes('site'))
    .sort();

  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token', available_keys: debugKeys }) };
  }

  try {
    // SITE_ID is not reliably auto-injected — discover it from the API instead
    let siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;

    if (!siteId) {
      // List sites for this token and match by URL (or take the first/only one)
      const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
      const sr = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sites = await sr.json();
      if (Array.isArray(sites) && sites.length > 0) {
        const match = siteUrl
          ? sites.find(s => s.url === siteUrl || s.ssl_url === siteUrl ||
              (s.default_domain && siteUrl.includes(s.default_domain)))
          : null;
        siteId = (match || sites[0]).id;
      }
    }

    if (!siteId) {
      return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_site_id' }) };
    }

    // Page through all Identity users to get a real total
    let page = 1, total = 0;
    while (true) {
      const r = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/identity/users?per_page=100&page=${page}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      const users = Array.isArray(d.users) ? d.users : [];
      total += users.length;
      if (users.length < 100) break;
      page++;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ count: total }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
