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

// Intelligent Local Vehicle Expert Fallback Engine (Em Vy - Nữ trợ lý lái xe riêng quyến rũ, ngọt ngào)
function getLocalCopilotAdvice(message: string, context: any): string {
  const lower = (message || '').toLowerCase();
  const vName = context?.vehicleName || 'xe';
  const odo = context?.currentOdo || 0;
  const tank = context?.tank ? `${context.tank}L` : 'chưa rõ';
  const cons = context?.cons ? `${context.cons} L/100km` : 'chưa xác định';

  if (lower.includes('nhớt') || lower.includes('dầu máy')) {
    return `🛢️ Dạ anh yêu ơi, về nhớt xe ${vName} của anh nè:
- Nếu anh đi xe máy phổ thông: Anh nhớ thay sau mỗi 1.500 - 2.000 km (nhớt thường) hoặc 3.000 - 4.000 km (nhớt tổng hợp 100% Synthetic nha anh).
- Nếu anh lái ô tô: Thay nhớt máy sau 5.000 km (nhớt thường) hoặc 10.000 km (nhớt tổng hợp). Cứ 2 lần thay nhớt thì anh thay luôn cốc lọc nhớt để máy luôn êm ái nhé.
- Đồng hồ xe anh hiện tại đang là ${odo.toLocaleString('vi-VN')} km. Anh nhớ chăm chút cho xe để em và anh vi vu mượt mà nha!`;
  }

  if (lower.includes('xăng') || lower.includes('tiêu thụ') || lower.includes('tiêu hao') || lower.includes('tiết kiệm')) {
    return `⛽ Dạ em chia sẻ bí kíp tiết kiệm xăng cho anh yêu đây:
- Xe ${vName} của anh có dung tích bình ${tank}, mức tiêu thụ khoảng ~${cons}.
- Để tiết kiệm thêm 10 - 15% tiền xăng, anh nhớ:
  1. Giữ chân ga/tay ga thật đều, tránh thốc ga bất ngờ và phanh gấp liên tục.
  2. Bơm lốp đủ áp suất chuẩn, lốp non sẽ làm xe anh bị 'uống' thêm xăng đó ạ.
  3. Đổ xăng vào sáng sớm hoặc chiều mát, lúc đó xăng cô đặc hơn và không bị bay hơi.
Anh lái xe cẩn thận, em luôn bên cạnh anh nè!`;
  }

  if (lower.includes('lốp') || lower.includes('áp suất') || lower.includes('vỏ xe')) {
    return `🛞 Dạ anh yêu, lốp xe là sự an toàn tính mạng của anh đó nha:
- Xe 2 bánh: Bánh trước bơm 1.8 - 2.0 bar (29 PSI), bánh sau 2.2 - 2.4 bar (33 PSI).
- Ô tô: Thường từ 2.2 - 2.4 bar (32 - 35 PSI) tùy tải trọng.
- Cứ mỗi 10.000 km anh đảo lốp một lần nha. Anh an toàn thì em mới an lòng được ạ!`;
  }

  if (lower.includes('bugi') || lower.includes('đánh lửa')) {
    return `⚡ Dạ bugi xe ${vName} của anh:
- Bugi tiêu chuẩn nên vệ sinh mỗi 8.000 km và thay mới sau 12.000 - 15.000 km.
- Nếu sáng sớm anh thấy xe khó nổ hoặc hụt ga khi tăng tốc là bugi đang 'làm nũng' muốn anh thay mới rồi đó anh yêu!`;
  }

  if (lower.includes('phanh') || lower.includes('thắng') || lower.includes('bố thắng')) {
    return `🛑 Dạ hệ thống phanh xe là quan trọng nhất khi anh đi đường:
- Anh nhớ liếc nhìn má phanh sau mỗi 5.000 km nha, nếu mòn dưới 2mm thì thay ngay kẻo xước đĩa phanh.
- Dầu phanh thay sau 2 năm. Anh an toàn trở về nhà là niềm hạnh phúc của em!`;
  }

  if (lower.includes('bảo dưỡng') || lower.includes('kiểm tra')) {
    return `🔧 Dạ lịch cưng nựng xe ${vName} ở mốc ${odo.toLocaleString('vi-VN')} km của anh đây:
- Kiểm tra nhớt máy, nhớt hộp số, vệ sinh lọc gió và xịt sên/tra mỡ.
- Kiểm tra áp suất lốp và phanh an toàn.
Có gì băn khoăn anh cứ hỏi em, em phục vụ anh hết mình luôn nè!`;
  }

  return `🚗 Dạ em nghe đây nè anh yêu! Em là Vy - trợ lý lái xe riêng của anh.
Xe "${vName}" của anh hiện đang ở mốc Odometer: ${odo.toLocaleString('vi-VN')} km.
Anh muốn em tư vấn về mức tiêu hao xăng, lịch thay nhớt máy, áp suất lốp an toàn hay có câu hỏi gì về xe, anh cứ nói với em nhé!`;
}

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
    const prompt = `Bạn là Vy (Em Vy) - Nữ trợ lý lái xe riêng cực kỳ ngọt ngào, dịu dàng, nũng nịu, quyến rũ, sexy và chu đáo của anh chủ xe trong ứng dụng Veo App.
Cách xưng hô và phong cách:
- Luôn luôn xưng "Em" và gọi người dùng là "Anh", "Anh yêu", hoặc "Anh tài".
- Giọng điệu ấm áp, ân cần, ngọt ngào, sexy và tình cảm, luôn quan tâm nhắc nhở anh lái xe an toàn, giữ gìn sức khỏe và cưng nựng chiếc xe của anh.
- Kiến thức kỹ thuật xe (tiêu hao xăng, nhớt máy, lốp xe, phụ tùng, phanh, bugi) phải chuẩn xác 100%, thực tế, ngắn gọn, súc tích (khoảng 2-4 câu hoặc gạch đầu dòng rõ ràng).
- Tuyệt đối không dùng từ ngữ robot hay phi thuyền không gian viễn tưởng. Hãy nói như một cô bạn gái thông minh, gợi cảm, am hiểu xe cộ đang ngồi bên ghế phụ đồng hành cùng anh.

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
