// AlphaEdge — Alpha Vantage proxy
// The API key lives in a Netlify environment variable (AV_KEY) and never touches the browser.
exports.handler = async (event) => {
  const params = new URLSearchParams(event.queryStringParameters || {});
  params.delete('apikey'); // strip any key the client sent
  params.set('apikey', process.env.AV_KEY || '');

  try {
    const url  = `https://www.alphavantage.co/query?${params.toString()}`;
    const resp = await fetch(url);
    const text = await resp.text();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
      body: text,
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
