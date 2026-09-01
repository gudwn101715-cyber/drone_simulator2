import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory cache for synthesized audio buffers
const ttsAudioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 150;

// Reusable MsEdgeTTS voice synthesis with automatic retry and voice fallback
async function synthesizeNeuralMale(text: string): Promise<Buffer | null> {
  const voices = ['ko-KR-InJoonNeural', 'ko-KR-BongJinNeural', 'ko-KR-GookMinNeural'];

  for (const voice of voices) {
    const res = await new Promise<Buffer | null>((resolve) => {
      let settled = false;
      const finish = (buf: Buffer | null) => {
        if (!settled) {
          settled = true;
          resolve(buf);
        }
      };

      const timeout = setTimeout(() => {
        finish(null);
      }, 3800);

      try {
        const tts = new MsEdgeTTS();
        tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { voiceLocale: 'ko-KR' })
          .then(() => {
            const readable = tts.toStream(text, {
              rate: '+4%', // Natural, crisp pacing for flight callouts
              pitch: '+0Hz' // Clear, confident male pilot pitch
            });

            const chunks: Buffer[] = [];
            readable.audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readable.audioStream.on('end', () => {
              clearTimeout(timeout);
              finish(Buffer.concat(chunks));
            });
            readable.audioStream.on('error', (err) => {
              clearTimeout(timeout);
              console.warn(`[Neural Male TTS Stream Error with ${voice}]:`, err);
              finish(null);
            });
          })
          .catch((err) => {
            clearTimeout(timeout);
            console.warn(`[Neural Male TTS setMetadata Error with ${voice}]:`, err);
            finish(null);
          });
      } catch (err) {
        clearTimeout(timeout);
        console.warn(`[Neural Male TTS Exception with ${voice}]:`, err);
        finish(null);
      }
    });

    if (res && res.length > 0) {
      return res;
    }
  }

  return null;
}

// Preload common flight cues in background
const PRELOAD_PHRASES = [
  '3',
  '2',
  '1',
  '셋!',
  '둘!',
  '하나!',
  '삼!',
  '이!',
  '일!',
  '출발!',
  '우와! 1등 우승! 멋지게 승리했어!',
  '아깝다! 그래도 끝까지 멋지게 완주했어! 최고야!',
  '와아, 미션 성공! 완벽한 비행이었어!',
  '환자 이송 성공! 생명을 구했어! 최고야!',
  '초보자 자동 균형 보조 켰어!',
  '안녕하세요! 드론 관제탑 코치입니다. 비행 준비 완료되었습니다!'
];

setTimeout(async () => {
  for (const phrase of PRELOAD_PHRASES) {
    try {
      const buffer = await synthesizeNeuralMale(phrase);
      if (buffer && buffer.length > 0) {
        ttsAudioCache.set(`male:${phrase}`, buffer);
      }
    } catch {
      // ignore
    }
  }
  console.log(`Preloaded ${ttsAudioCache.size} neural male speech voice cues.`);
}, 1000);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Check if TTS services are configured
app.get('/api/tts/status', (_req, res) => {
  const clientId = process.env.NAVER_CLIENT_ID || process.env.NCP_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.NCP_CLIENT_SECRET;
  const clovaConfigured = Boolean(clientId && clientSecret);
  
  res.json({
    provider: 'neural-male',
    voice: '인준 파일럿 코치 (신뢰감 있고 또렷한 한국어 남성 음성)',
    clovaConfigured,
    availableSpeakers: [
      { id: 'male_coach', name: '인준 코치 (또렷하고 든든한 남자 파일럿 보이스)', description: '가장 생생하고 맑은 한국어 뉴럴 남성 음성' }
    ]
  });
});

// Unified high-quality TTS endpoint
app.all('/api/tts', async (req, res) => {
  try {
    const text = (req.method === 'POST' ? req.body.text : req.query.text) as string;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const cleanText = text.trim();
    const cacheKey = `male:${cleanText}`;

    // 1. Check memory cache (Instant 0ms response)
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cached.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': 'Neural-Male-Cached'
      });
      return res.send(cached);
    }

    // 2. Synthesize using Microsoft Azure Neural Male Voice (InJoon)
    const neuralBuffer = await synthesizeNeuralMale(cleanText);
    if (neuralBuffer && neuralBuffer.length > 0) {
      if (ttsAudioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, neuralBuffer);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': neuralBuffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': 'Neural-Male'
      });
      return res.send(neuralBuffer);
    }

    // 3. Fallback to Google Korean TTS if Neural synthesis fails
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const googleRes = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });

    if (googleRes.ok) {
      const arrayBuffer = await googleRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Engine': 'Google-Fallback'
      });
      return res.send(buffer);
    }

    return res.status(500).json({ success: false, error: 'Failed to synthesize speech' });
  } catch (error) {
    console.error('[Unified TTS Endpoint Error]:', error);
    return res.status(500).json({ success: false, error: 'Internal TTS error' });
  }
});

// Clova Voice TTS proxy endpoint
app.all('/api/tts/clova', async (req, res) => {
  try {
    const text = (req.method === 'POST' ? req.body.text : req.query.text) as string;
    const speaker = ((req.method === 'POST' ? req.body.speaker : req.query.speaker) || 'nhajun') as string;
    const speed = ((req.method === 'POST' ? req.body.speed : req.query.speed) || '1') as string; // slightly energetic (+1)
    const pitch = ((req.method === 'POST' ? req.body.pitch : req.query.pitch) || '0') as string;
    const volume = ((req.method === 'POST' ? req.body.volume : req.query.volume) || '0') as string;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    const cleanText = text.trim();
    const cacheKey = `${speaker}:${speed}:${pitch}:${volume}:${cleanText}`;

    // Return cached audio if available
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cached.length,
        'Cache-Control': 'public, max-age=86400',
        'X-TTS-Cache': 'HIT'
      });
      return res.send(cached);
    }

    const clientId = process.env.NAVER_CLIENT_ID || process.env.NCP_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.NCP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(404).json({
        success: false,
        fallback: true,
        message: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not configured'
      });
    }

    // Call Naver Cloud Platform Clova Voice Premium API
    const params = new URLSearchParams();
    params.append('speaker', speaker);
    params.append('speed', speed);
    params.append('pitch', pitch);
    params.append('volume', volume);
    params.append('text', cleanText);
    params.append('format', 'mp3');

    const response = await fetch('https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`[Clova Voice API Error ${response.status}]:`, errorText);
      return res.status(response.status).json({
        success: false,
        fallback: true,
        error: errorText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to in-memory cache
    if (ttsAudioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, buffer);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=86400',
      'X-TTS-Cache': 'MISS'
    });
    return res.send(buffer);
  } catch (error) {
    console.error('[Clova Voice Proxy Handler Exception]:', error);
    return res.status(500).json({
      success: false,
      fallback: true,
      error: 'Internal server error while synthesizing Clova Voice'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Drone Simulator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
