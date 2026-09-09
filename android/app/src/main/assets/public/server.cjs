var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_msedge_tts = require("msedge-tts");
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
var ttsAudioCache = /* @__PURE__ */ new Map();
var MAX_CACHE_SIZE = 150;
async function synthesizeNeuralMale(text) {
  const voices = ["ko-KR-InJoonNeural", "ko-KR-BongJinNeural", "ko-KR-GookMinNeural"];
  for (const voice of voices) {
    const res = await new Promise((resolve) => {
      let settled = false;
      const finish = (buf) => {
        if (!settled) {
          settled = true;
          resolve(buf);
        }
      };
      const timeout = setTimeout(() => {
        finish(null);
      }, 3800);
      try {
        const tts = new import_msedge_tts.MsEdgeTTS();
        tts.setMetadata(voice, import_msedge_tts.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, { voiceLocale: "ko-KR" }).then(() => {
          const readable = tts.toStream(text, {
            rate: "+4%",
            // Natural, crisp pacing for flight callouts
            pitch: "+0Hz"
            // Clear, confident male pilot pitch
          });
          const chunks = [];
          readable.audioStream.on("data", (chunk) => chunks.push(chunk));
          readable.audioStream.on("end", () => {
            clearTimeout(timeout);
            finish(Buffer.concat(chunks));
          });
          readable.audioStream.on("error", (err) => {
            clearTimeout(timeout);
            console.warn(`[Neural Male TTS Stream Error with ${voice}]:`, err);
            finish(null);
          });
        }).catch((err) => {
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
var PRELOAD_PHRASES = [
  "3",
  "2",
  "1",
  "\uC14B!",
  "\uB458!",
  "\uD558\uB098!",
  "\uC0BC!",
  "\uC774!",
  "\uC77C!",
  "\uCD9C\uBC1C!",
  "\uC6B0\uC640! 1\uB4F1 \uC6B0\uC2B9! \uBA4B\uC9C0\uAC8C \uC2B9\uB9AC\uD588\uC5B4!",
  "\uC544\uAE5D\uB2E4! \uADF8\uB798\uB3C4 \uB05D\uAE4C\uC9C0 \uBA4B\uC9C0\uAC8C \uC644\uC8FC\uD588\uC5B4! \uCD5C\uACE0\uC57C!",
  "\uC640\uC544, \uBBF8\uC158 \uC131\uACF5! \uC644\uBCBD\uD55C \uBE44\uD589\uC774\uC5C8\uC5B4!",
  "\uD658\uC790 \uC774\uC1A1 \uC131\uACF5! \uC0DD\uBA85\uC744 \uAD6C\uD588\uC5B4! \uCD5C\uACE0\uC57C!",
  "\uCD08\uBCF4\uC790 \uC790\uB3D9 \uADE0\uD615 \uBCF4\uC870 \uCF30\uC5B4!",
  "\uC548\uB155\uD558\uC138\uC694! \uB4DC\uB860 \uAD00\uC81C\uD0D1 \uCF54\uCE58\uC785\uB2C8\uB2E4. \uBE44\uD589 \uC900\uBE44 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4!"
];
setTimeout(async () => {
  for (const phrase of PRELOAD_PHRASES) {
    try {
      const buffer = await synthesizeNeuralMale(phrase);
      if (buffer && buffer.length > 0) {
        ttsAudioCache.set(`male:${phrase}`, buffer);
      }
    } catch {
    }
  }
  console.log(`Preloaded ${ttsAudioCache.size} neural male speech voice cues.`);
}, 1e3);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});
app.get("/api/tts/status", (_req, res) => {
  const clientId = process.env.NAVER_CLIENT_ID || process.env.NCP_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.NCP_CLIENT_SECRET;
  const clovaConfigured = Boolean(clientId && clientSecret);
  res.json({
    provider: "neural-male",
    voice: "\uC778\uC900 \uD30C\uC77C\uB7FF \uCF54\uCE58 (\uC2E0\uB8B0\uAC10 \uC788\uACE0 \uB610\uB837\uD55C \uD55C\uAD6D\uC5B4 \uB0A8\uC131 \uC74C\uC131)",
    clovaConfigured,
    availableSpeakers: [
      { id: "male_coach", name: "\uC778\uC900 \uCF54\uCE58 (\uB610\uB837\uD558\uACE0 \uB4E0\uB4E0\uD55C \uB0A8\uC790 \uD30C\uC77C\uB7FF \uBCF4\uC774\uC2A4)", description: "\uAC00\uC7A5 \uC0DD\uC0DD\uD558\uACE0 \uB9D1\uC740 \uD55C\uAD6D\uC5B4 \uB274\uB7F4 \uB0A8\uC131 \uC74C\uC131" }
    ]
  });
});
app.all("/api/tts", async (req, res) => {
  try {
    const text = req.method === "POST" ? req.body.text : req.query.text;
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text parameter is required" });
    }
    const cleanText = text.trim();
    const cacheKey = `male:${cleanText}`;
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": cached.length,
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Engine": "Neural-Male-Cached"
      });
      return res.send(cached);
    }
    const neuralBuffer = await synthesizeNeuralMale(cleanText);
    if (neuralBuffer && neuralBuffer.length > 0) {
      if (ttsAudioCache.size >= MAX_CACHE_SIZE) {
        const firstKey = ttsAudioCache.keys().next().value;
        if (firstKey) ttsAudioCache.delete(firstKey);
      }
      ttsAudioCache.set(cacheKey, neuralBuffer);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": neuralBuffer.length,
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Engine": "Neural-Male"
      });
      return res.send(neuralBuffer);
    }
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ko&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const googleRes = await fetch(googleTtsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://translate.google.com/"
      }
    });
    if (googleRes.ok) {
      const arrayBuffer = await googleRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length,
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Engine": "Google-Fallback"
      });
      return res.send(buffer);
    }
    return res.status(500).json({ success: false, error: "Failed to synthesize speech" });
  } catch (error) {
    console.error("[Unified TTS Endpoint Error]:", error);
    return res.status(500).json({ success: false, error: "Internal TTS error" });
  }
});
app.all("/api/tts/clova", async (req, res) => {
  try {
    const text = req.method === "POST" ? req.body.text : req.query.text;
    const speaker = (req.method === "POST" ? req.body.speaker : req.query.speaker) || "nhajun";
    const speed = (req.method === "POST" ? req.body.speed : req.query.speed) || "1";
    const pitch = (req.method === "POST" ? req.body.pitch : req.query.pitch) || "0";
    const volume = (req.method === "POST" ? req.body.volume : req.query.volume) || "0";
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text parameter is required" });
    }
    const cleanText = text.trim();
    const cacheKey = `${speaker}:${speed}:${pitch}:${volume}:${cleanText}`;
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": cached.length,
        "Cache-Control": "public, max-age=86400",
        "X-TTS-Cache": "HIT"
      });
      return res.send(cached);
    }
    const clientId = process.env.NAVER_CLIENT_ID || process.env.NCP_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.NCP_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return res.status(404).json({
        success: false,
        fallback: true,
        message: "NAVER_CLIENT_ID / NAVER_CLIENT_SECRET not configured"
      });
    }
    const params = new URLSearchParams();
    params.append("speaker", speaker);
    params.append("speed", speed);
    params.append("pitch", pitch);
    params.append("volume", volume);
    params.append("text", cleanText);
    params.append("format", "mp3");
    const response = await fetch("https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret
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
    if (ttsAudioCache.size >= MAX_CACHE_SIZE) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, buffer);
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length,
      "Cache-Control": "public, max-age=86400",
      "X-TTS-Cache": "MISS"
    });
    return res.send(buffer);
  } catch (error) {
    console.error("[Clova Voice Proxy Handler Exception]:", error);
    return res.status(500).json({
      success: false,
      fallback: true,
      error: "Internal server error while synthesizing Clova Voice"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Drone Simulator Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
