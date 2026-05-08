// Fetches real user count from Netlify Identity admin API
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token' }) };
  }

  try {
    // SITE_ID is not reliably auto-injected — discover it from the API instead
    let siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
    let siteName = null;

    if (!siteId) {
      const siteUrl = (process.env.URL || process.env.DEPLOY_PRIME_URL || '').replace(/\/$/, '');
      const sr = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const sites = await sr.json();
      if (!Array.isArray(sites)) {
        return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'sites_api_error', raw: JSON.stringify(sites).slice(0,200) }) };
      }
      const match = siteUrl
        ? sites.find(s => s.url === siteUrl || s.ssl_url === siteUrl ||
            (s.default_domain && siteUrl.includes(s.default_domain)))
        : null;
      const chosen = match || sites.find(s => s.name && s.name.includes('maamoul')) || sites[0];
      if (!chosen) {
        return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_sites_found', siteCount: sites.length }) };
      }
      siteId = chosen.id;
      siteName = chosen.name;
    }

    // Try Identity users endpoint
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/identity/users?per_page=100&page=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const d = await r.json();

    // Debug: return what we got
    const users = Array.isArray(d.users) ? d.users : [];
    const total = d.total != null ? d.total : users.length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ count: total, debug_site: siteName, debug_siteId: siteId, debug_total_field: d.total, debug_users_len: users.length }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
