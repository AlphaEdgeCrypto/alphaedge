// Called once after a successful signup — increments the member counter in Netlify Blobs
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const store    = getStore({ name: 'app-stats', consistency: 'strong' });
    const val      = await store.get('user_count');
    const newCount = (parseInt(val || '0', 10)) + 1;
    await store.set('user_count', String(newCount));
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ count: newCount }),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
