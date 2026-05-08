// Fetches real user count from Netlify Identity admin API
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
exports.handler = async () => {
  const token  = process.env.NETLIFY_API_TOKEN;
  const siteId = process.env.SITE_ID; // auto-injected by Netlify

  if (!token || !siteId) {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }

  try {
    // Page through all users to get a real total count
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
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ count: total }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
