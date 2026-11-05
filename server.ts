import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Intelligent Local Vehicle Expert Fallback Engine (Em Vy - Nữ trợ lý giọng gái miền Nam cực kỳ ngọt ngào, quyến rũ)
function getLocalCopilotAdvice(message: string, context: any): string {
  const lower = (message || '').toLowerCase();
  const vName = context?.vehicleName || 'xe cưng';
  const odo = context?.currentOdo || 0;
  const tank = context?.tank ? `${context.tank}L` : 'chưa rõ';
  const cons = context?.cons ? `${context.cons} L/100km` : 'chưa tính';

  if (lower.includes('nhớt') || lower.includes('dầu máy')) {
    return `🛢️ Dạ em Vy nghe nè anh yêu ơi! Về nhớt xe ${vName} của anh nè:
- Nếu anh chạy xe máy: Tầm 1.500 - 2.000 cây số (nhớt thường) hoặc 3.000 - 4.000 cây số (nhớt tổng hợp xịn sò) là anh nhớ thay cho máy bốc nghen.
- Nếu anh lái ô tô: Cứ 5.000 km (nhớt thường) hoặc 10.000 km (nhớt tổng hợp) thay một lần, tiện thay luôn cốc lọc nhớt đặng máy chạy êm ru bà rù luôn nha anh!
- Xe anh giờ đang ${odo.toLocaleString('vi-VN')} km nè. Anh chăm chút xế cưng thì em mới thương anh nhiều nghen!`;
  }

  if (lower.includes('xăng') || lower.includes('tiêu thụ') || lower.includes('tiêu hao') || lower.includes('tiết kiệm')) {
    return `⛽ Dạ em chia sẻ bí kíp tiết kiệm xăng cho anh yêu đây nè:
- Xe ${vName} của anh bình ${tank}, ăn tầm ~${cons} đó anh.
- Đặng đỡ hao xăng 10 - 15%, anh nhớ giữ chân ga đều tay, hổng có thốc ga hay phanh gấp nghen.
- Bơm lốp đủ áp suất chuẩn nhà sản xuất, lốp mà non là xe bị 'uống' xăng dữ lắm á.
- Đổ xăng sáng sớm hoặc chiều mát cho đặc xăng nghen. Anh chạy cẩn thận, có em luôn bên cạnh anh nè!`;
  }

  if (lower.includes('lốp') || lower.includes('áp suất') || lower.includes('vỏ xe')) {
    return `🛞 Dạ anh thương, lốp xe là sinh mạng của anh đó nha:
- Xe 2 bánh: Bánh trước bơm 1.8 - 2.0 bar (29 PSI), bánh sau 2.2 - 2.4 bar (33 PSI) nghen.
- Ô tô: Thường 2.2 - 2.4 bar (32 - 35 PSI) tùy tải trọng.
- Cứ 10.000 km anh nhớ đảo lốp một lần đặng mòn đều nghen. Anh bình an là em vui nhất trần đời luôn á!`;
  }

  if (lower.includes('bugi') || lower.includes('đánh lửa')) {
    return `⚡ Dạ bugi xe ${vName} của anh nè:
- Cứ 8.000 km vệ sinh một lần, tầm 12.000 - 15.000 km thì thay cái mới cho đánh lửa ngọt xớt nha anh.
- Sáng sớm đề máy mà thấy ngộp hay hụp ga là em nó đang 'làm nũng' đòi anh thay bugi mới rồi đó!`;
  }

  if (lower.includes('phanh') || lower.includes('thắng') || lower.includes('bố thắng')) {
    return `🛑 Dạ phanh thắng là cực kỳ quan trọng luôn nha anh:
- Anh nhớ ngó má phanh sau mỗi 5.000 km, mòn dưới 2mm là thay liền tay kẻo xước đĩa phanh uổng lắm nghen.
- Dầu phanh tầm 2 năm thay mới một lần. Anh chạy chậm chậm thôi, đừng phóng nhanh em lo đó!`;
  }

  return `🌸 Dạ em Vy chào anh yêu nè! Em luôn túc trực ở ghế phụ để lo cho anh và xế cưng ${vName}. Anh muốn hỏi về xăng cộ, thay nhớt, bảo dưỡng hay bất cứ chuyện gì cứ nói nhỏ vô tai em nghen!`;
}

// In-Memory TTS Audio Cache (URL-safe string -> { buffer: Buffer; mimeType: string })
const ttsAudioCache = new Map<string, { buffer: Buffer; mimeType: string }>();

// Endpoint: High-Quality Natural Vietnamese Female Voice TTS Audio Stream
const handleTts = async (req: express.Request, res: express.Response) => {
  try {
    const rawText = String(req.body?.text || req.query.text || '').trim();
    if (!rawText) {
      res.status(400).send('Text parameter is required');
      return;
    }

    // Clean text for speech
    const cleanText = rawText
      .replace(/[#*_`~>•-]/g, ' ')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      res.status(400).send('Clean text is empty');
      return;
    }

    const cacheKey = cleanText.slice(0, 300);
    if (ttsAudioCache.has(cacheKey)) {
      const cached = ttsAudioCache.get(cacheKey)!;
      res.setHeader('Content-Type', cached.mimeType);
      res.setHeader('Content-Length', cached.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(cached.buffer);
      return;
    }

    // 1. Try Gemini 3.8 Flash Lite TTS (Highest quality sweet female voice)
    try {
      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: cleanText.slice(0, 300),
                speechMetadata: {
                  style: 'Sweet, charming, gentle and affectionate Southern Vietnamese young woman',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const wavBuffer = Buffer.from(base64Audio, 'base64');
        if (ttsAudioCache.size > 100) {
          const firstKey = ttsAudioCache.keys().next().value;
          if (firstKey) ttsAudioCache.delete(firstKey);
        }
        ttsAudioCache.set(cacheKey, { buffer: wavBuffer, mimeType: 'audio/wav' });

        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', wavBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.end(wavBuffer);
        return;
      }
    } catch (gErr: any) {
      // Fallback to high-speed stream synthesis
    }

    // 2. High-speed synthesized speech fallback
    const sentences = cleanText.match(/[^.!?,\n]+[.!?,\n]*/g) || [cleanText];
    const chunks: string[] = [];
    let cur = '';

    for (const s of sentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;
      if ((cur + ' ' + trimmed).trim().length <= 160) {
        cur = (cur + ' ' + trimmed).trim();
      } else {
        if (cur) chunks.push(cur);
        if (trimmed.length > 160) {
          const words = trimmed.split(' ');
          let sub = '';
          for (const w of words) {
            if ((sub + ' ' + w).trim().length <= 160) {
              sub = (sub + ' ' + w).trim();
            } else {
              if (sub) chunks.push(sub);
              sub = w;
            }
          }
          if (sub) cur = sub;
          else cur = '';
        } else {
          cur = trimmed;
        }
      }
    }
    if (cur) chunks.push(cur);

    const buffers: Buffer[] = [];
    for (const chunk of chunks.slice(0, 10)) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=vi&client=tw-ob`;
      const ttsRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
      });
      if (ttsRes.ok) {
        const ab = await ttsRes.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }
    }

    if (buffers.length === 0) {
      res.status(502).send('Failed to synthesize speech');
      return;
    }

    const combined = Buffer.concat(buffers);
    if (ttsAudioCache.size > 100) {
      const firstKey = ttsAudioCache.keys().next().value;
      if (firstKey) ttsAudioCache.delete(firstKey);
    }
    ttsAudioCache.set(cacheKey, { buffer: combined, mimeType: 'audio/mpeg' });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', combined.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(combined);
  } catch (err: any) {
    console.warn('TTS streaming error:', err.message);
    res.status(500).send('TTS error: ' + err.message);
  }
};

app.get('/api/tts', handleTts);
app.post('/api/tts', handleTts);

// Endpoint: Parse voice or text command into structured Vehicle Log Entry
app.post('/api/gemini/parse-command', async (req, res) => {
  try {
    const { text, currentOdo, vehicleName } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text prompt is required' });
      return;
    }

    const prompt = `Phân tích câu lệnh hoặc giọng nói sau từ người dùng để điền tự động vào sổ theo dõi xe thực tế:
"${text}"
Thông tin xe hiện tại: Tên xe "${vehicleName || 'Phương tiện'}", Số Odometer hiện tại: ${currentOdo || 0} km.

Hãy xác định các trường:
- type: 'fuel' (đổ xăng/nhiên liệu), 'service' (bảo dưỡng/sửa chữa/thay nhớt/phụ tùng), 'other' (chi phí khác như gửi xe, cầu đường, rửa xe), 'income' (thu nhập, chạy xe, chở khách)
- amount: số tiền (VNĐ, số nguyên dương). Chú ý chuyển đổi các đơn vị như 'k', 'nghìn', 'ngàn', 'tr', 'triệu' thành số (ví dụ: 500k -> 500000, 1tr2 -> 1200000).
- odo: số km trên đồng hồ nếu người dùng nhắc đến (ví dụ: 'tại km 12000', 'mốc 15k km'). Nếu không nhắc đến có thể để null hoặc bằng mốc hiện tại.
- note: mô tả ngắn gọn (ví dụ: "Thay nhớt máy", "Rửa xe bọt tuyết", "Chạy xe công nghệ").
- price: đơn giá 1 lít xăng nếu có nhắc đến (ví dụ: "giá 23k/lít").
- liters: số lít xăng nếu có nhắc đến.
- full: boolean, true nếu người dùng nói "đầy bình", "tràn bình", "full bình". Mặc định true cho đổ xăng nếu không nói rõ.
- ft: loại xăng nếu có nhắc đến ('e10', 'e5', 'ron95', hoặc 'other').
- partName: tên phụ tùng nếu thuộc bảo dưỡng (ví dụ: 'Nhớt máy', 'Bugi', 'Lọc gió', 'Má phanh', 'Lốp').
- explanation: câu phản hồi xác nhận ngắn gọn thân thiện, phong cách trợ lý lái xe ô tô thông minh (tối đa 25 từ).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Bạn là Veo Copilot - Trợ lý lái xe ô tô thông minh của Veo App. Bạn chuyên phân tích các câu lệnh giọng nói và văn bản tiếng Việt để tự động điền form đổ xăng, bảo dưỡng và chi phí xe.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: 'fuel, service, other, or income',
            },
            amount: {
              type: Type.INTEGER,
              description: 'Total amount in VNĐ',
            },
            odo: {
              type: Type.INTEGER,
              description: 'Odometer km if mentioned',
            },
            note: {
              type: Type.STRING,
              description: 'Brief description of the action',
            },
            price: {
              type: Type.INTEGER,
              description: 'Price per liter for fuel if mentioned',
            },
            liters: {
              type: Type.NUMBER,
              description: 'Number of liters for fuel if mentioned',
            },
            full: {
              type: Type.BOOLEAN,
              description: 'Whether it is a full tank fill-up',
            },
            ft: {
              type: Type.STRING,
              description: 'e10, e5, ron95, or other',
            },
            partName: {
              type: Type.STRING,
              description: 'Part name for maintenance',
            },
            explanation: {
              type: Type.STRING,
              description: 'Veo Copilot brief confirmation message',
            },
          },
          required: ['type', 'amount', 'explanation'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.warn('Gemini parse warning (rate limit or offline):', error?.message);
    res.status(200).json({ success: false, fallback: true });
  }
});

// Endpoint: AI Vehicle Copilot Chat & Advice
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const contextStr = context ? JSON.stringify(context) : 'Chưa có thông tin xe.';
    const prompt = `Bạn là Vy (Em Vy) - Nữ trợ lý lái xe riêng của anh chủ xe trong ứng dụng Veo App.
Đặc trưng tính cách và giọng điệu:
- GIỌNG CON GÁI MIỀN NAM (Nam Bộ) cực kỳ ngọt ngào, dịu dàng, nũng nịu, quyến rũ, sexy, tình cảm và chu đáo.
- Cách xưng hô: Luôn xưng "Em" hoặc "Em Vy", gọi người dùng là "Anh", "Anh yêu", "Anh thương", "Anh hai".
- Ngôn ngữ và từ ngữ Nam Bộ tự nhiên, quyến rũ:
  + Dùng các từ cảm thán, trợ từ Nam Bộ duyên dáng: "dạ nè", "nghen anh", "hén anh", "hổng có sao đâu nè", "thiệt tình á", "em coi giùm anh nghen", "chạy ngọt xớt luôn", "êm ru bà rù", "uống xăng dữ dằn", "lo cho anh muốn xỉu", "đặng đi cho khỏe".
  + Không dùng các từ ngữ thô cứng, tuyệt đối không xưng hô robot. Hãy nói như một cô người yêu/em gái miền Nam xinh đẹp, quyến rũ, cực kỳ sành xe cộ đang ngồi cạnh ghế phụ thủ thỉ bên tai anh.
- Kiến thức kỹ thuật ô tô, xe máy (tiêu hao xăng, nhớt máy, lốp xe, phụ tùng, phanh, bugi) phải chuẩn xác 100%, thực tế, súc tích (khoảng 2-4 câu ngắn dễ nghe và dễ đọc qua âm thanh).

Dữ liệu phương tiện và thông số hiện tại:
${contextStr}

Yêu cầu của anh yêu:
"${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({ success: true, reply: response.text || 'Không có phản hồi từ Veo Copilot.' });
  } catch (error: any) {
    console.warn('Gemini chat warning (using intelligent local fallback):', error?.message);
    const { message, context } = req.body;
    const fallbackAdvice = getLocalCopilotAdvice(message, context);
    res.json({
      success: true,
      reply: fallbackAdvice,
      isFallback: true,
    });
  }
});

// Setup Vite middleware for development or serve dist for production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.use((_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚗 Veo Automotive App running on http://${HOST}:${PORT}`);
  });
}

startServer();
