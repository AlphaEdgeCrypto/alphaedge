// Fetches real user count from Netlify Identity admin API
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token' }) };
  }

  try {
    // List all sites and find the one that is majestic-maamoul-22e146
    const sr = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sites = await sr.json();
    if (!Array.isArray(sites)) {
      return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'sites_error', raw: JSON.stringify(sites).slice(0,300) }) };
    }

    // Show all site names/domains for debugging
    const siteList = sites.map(s => ({ id: s.id, name: s.name, domain: s.default_domain, ssl: s.ssl_url }));

    // Find our site by subdomain
    const target = sites.find(s =>
      (s.default_domain && s.default_domain.includes('majestic-maamoul-22e146')) ||
      (s.name && s.name === 'majestic-maamoul-22e146') ||
      (s.ssl_url && s.ssl_url.includes('majestic-maamoul-22e146'))
    );

    if (!target) {
      return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'site_not_matched', sites: siteList }) };
    }

    // Get Identity users for the correct site
    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${target.id}/identity/users?per_page=100&page=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = await r.text();
    const d = JSON.parse(raw);
    const users = Array.isArray(d) ? d : (Array.isArray(d.users) ? d.users : []);
    const total = (d.total != null) ? d.total : users.length;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ count: total, debug_id: target.id, debug_http: r.status, debug_raw: raw.slice(0, 300) }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
