// Returns the current registered member count from Netlify Blobs
const { getStore } = require('@netlify/blobs');

exports.handler = async () => {
  try {
    const store = getStore({ name: 'app-stats', consistency: 'strong' });
    const val   = await store.get('user_count');
    const count = parseInt(val || '0', 10);
    return {
      statusCode: 200,
      headers: {
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ count }),
    };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ count: 0 }) };
  }
};
