// Fetches real user count from Netlify Identity admin API
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token' }) };
  }

  try {
    const siteId = '93eefe77-7d79-4fcd-a351-e1452665c0f9'; // hardcoded from debug

    const r = await fetch(
      `https://api.netlify.com/api/v1/sites/${siteId}/identity/users?per_page=100&page=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const raw = await r.text();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ raw_response: raw.slice(0, 500), http_status: r.status }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
