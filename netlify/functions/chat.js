const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    
    const { message } = JSON.parse(event.body);
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: response.content[0].text
      })
    };
  } catch (error) {
    console.error('Error details:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: error.toString()
      })
    };
  }
};