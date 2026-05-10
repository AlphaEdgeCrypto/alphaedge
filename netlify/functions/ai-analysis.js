const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'CLAUDE_API_KEY not set' }) };

  try {
    const { symbol, currentPrice, timeframesText, indicatorsText, bidWall, askWall, imbalance, imbalanceDir, funding, oi, cvd } = JSON.parse(event.body || '{}');

    const client = new Anthropic({ apiKey });

    const userPrompt = `Analyse ${symbol} trading data and return JSON with this exact structure:
{
  "bias": "BULLISH" or "BEARISH" or "NEUTRAL",
  "confidence": number 0-100,
  "pattern": "pattern name or null",
  "structure": "one sentence market structure description",
  "entry_zone": { "low": price_number, "high": price_number },
  "targets": [price1, price2, price3],
  "stop_loss": price_number,
  "key_levels": { "support": [price1, price2], "resistance": [price1, price2] },
  "timeframe_alignment": "ALIGNED_BULL" or "ALIGNED_BEAR" or "MIXED",
  "reasoning": "2-3 sentences max, plain English",
  "invalidation": "one sentence what would invalidate this view",
  "urgency": "NOW" or "WAIT" or "AVOID"
}

MARKET DATA:
Symbol: ${symbol}
Current Price: ${currentPrice}

TIMEFRAMES (last 3 candles each, O/H/L/C):
${timeframesText}

INDICATORS:
${indicatorsText}

ORDER BOOK:
Bid wall: ${bidWall}
Ask wall: ${askWall}
Imbalance: ${imbalance}% ${imbalanceDir}

FUNDING RATE: ${funding}
CVD (last 20 candles): ${cvd}

Return ONLY valid JSON. No markdown, no explanation.`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      system: 'You are an elite quantitative trading analyst. Analyse the provided market data and return precise, actionable trading analysis as valid JSON only. No markdown. No text outside the JSON object.',
      messages: [{ role: 'user', content: userPrompt }],
    });

    const text = message.content[0].text;
    // Validate it's JSON
    JSON.parse(text);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' },
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message }),
    };
  }
};
