// One-time endpoint to seed the member count in Netlify Blobs
// Usage: POST /api/seed-count  { "count": 15, "secret": "<SEED_SECRET>" }
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { count, secret } = JSON.parse(event.body || '{}');
    const expected = process.env.SEED_SECRET;
    if (!expected || secret !== expected) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }
    const store = getStore({ name: 'app-stats', consistency: 'strong' });
    await store.set('user_count', String(parseInt(count, 10)));
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: true, count: parseInt(count, 10) }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
