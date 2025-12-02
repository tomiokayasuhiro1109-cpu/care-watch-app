import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    
    const { message } = req.body;
    console.log('Received message:', message);

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    console.log('Calling Claude API...');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: message
      }]
    });

    console.log('Claude API response received');

    return res.status(200).json({
      response: response.content[0].text
    });
  } catch (error) {
    console.error('Error details:', error);
    return res.status(500).json({ 
      error: error.message,
      details: error.toString()
    });
  }
}