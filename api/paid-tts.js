import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

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
    const { message, character } = req.body;

    // ===== Claude APIでテキスト生成 =====
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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
      woman30: 'shimmer',   // 柔らかい女性（看護師）
      girl10: 'nova',       // 明るい女性（小学生）
      auntie: 'nova',       // 明るい女性（おばちゃん）
      muscle: 'onyx',       // 低音男性（マッチョ）
      handsome: 'echo',     // 男性（爽やか青年）
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

    return res.status(200).json({
      text: responseText,
      audio: audioBase64,
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
}