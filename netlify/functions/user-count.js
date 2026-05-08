// Fetches real user count via the GoTrue admin endpoint
// Requires NETLIFY_API_TOKEN env var (Netlify user settings → Personal access tokens)
const crypto = require('crypto');

exports.handler = async () => {
  const token = process.env.NETLIFY_API_TOKEN || process.env.Netlify_API_TOKEN || process.env.netlify_api_token;
  if (!token) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, reason: 'no_token' }) };
  }

  try {
    // GoTrue admin endpoint — lives on the same site
    const siteUrl = (process.env.URL || 'https://majestic-maamoul-22e146.netlify.app').replace(/\/$/, '');
    const gotrueBase = siteUrl + '/.netlify/identity';

    // Attempt 1: Use Netlify API token directly as Bearer (sometimes works)
    const r1 = await fetch(`${gotrueBase}/admin/users?per_page=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const raw1 = await r1.text();

    // Attempt 2: Also try the Netlify REST API site details to get instance_id
    const siteR = await fetch('https://api.netlify.com/api/v1/sites/93eefe77-7d79-4fcd-a351-e1452665c0f9', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const siteData = await siteR.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        count: 0,
        gotrue_status: r1.status,
        gotrue_raw: raw1.slice(0, 400),
        site_identity_enabled: siteData.identity_instance_id || siteData.use_custom_oidc || null,
        site_plan: siteData.plan,
      }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0, error: e.message }) };
  }
};
