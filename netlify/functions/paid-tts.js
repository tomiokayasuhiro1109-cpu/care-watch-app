const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');

exports.handler = async (event) => {
  // CORSヘッダー
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // OPTIONSリクエスト対応
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { message, character } = JSON.parse(event.body);

    // ===== Claude APIでテキスト生成 =====
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const responseText = claudeResponse.content[0].text;

    // ===== OpenAI TTSで音声生成 =====
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // キャラクター別の音声設定
    const voiceMap = {
      student: 'nova',      // 明るい・高め
      woman30: 'alloy',     // 落ち着いた女性
      auntie: 'shimmer',    // 元気な女性
      muscle: 'onyx',       // 力強い男性
      handsome: 'echo',     // 爽やかな男性
    };

    const selectedVoice = voiceMap[character] || 'alloy';

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: responseText,
    });

    // 音声データをBase64に変換
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        text: responseText,
        audio: audioBase64,
      }),
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal Server Error',
        details: error.message,
      }),
    };
  }
};