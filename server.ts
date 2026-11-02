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

// Intelligent Local Vehicle Expert Fallback Engine (when Gemini API rate limit is reached or offline)
function getLocalCopilotAdvice(message: string, context: any): string {
  const lower = (message || '').toLowerCase();
  const vName = context?.vehicleName || 'xe';
  const odo = context?.currentOdo || 0;
  const tank = context?.tank ? `${context.tank}L` : 'chưa rõ';
  const cons = context?.cons ? `${context.cons} L/100km` : 'chưa xác định';

  if (lower.includes('nhớt') || lower.includes('dầu máy')) {
    return `🛢️ [Tư vấn nhớt ${vName}]:
- Xe máy phổ thông: Thay sau mỗi 1.500 - 2.000 km (nhớt khoáng/bán tổng hợp) hoặc 3.000 - 4.000 km (nhớt tổng hợp toàn phần 100% Synthetic như Motul, Liqui Moly, Shell Advance).
- Ô tô: Thay nhớt động cơ sau mỗi 5.000 km (nhớt thông thường) hoặc 10.000 km (nhớt tổng hợp). Luôn nhớ thay lọc nhớt sau mỗi 2 lần thay nhớt máy.
- Đồng hồ ${vName} hiện tại: ${odo.toLocaleString('vi-VN')} km. Hãy kiểm tra que thăm nhớt định kỳ hàng tháng!`;
  }

  if (lower.includes('xăng') || lower.includes('tiêu thụ') || lower.includes('tiêu hao') || lower.includes('tiết kiệm')) {
    return `⛽ [Mức tiêu hao & Tiết kiệm nhiên liệu cho ${vName}]:
- Thông số tiêu chuẩn xe: ~${cons} (Bình xăng: ${tank}).
- Mẹo tiết kiệm xăng thực tế:
  1. Giữ đều tay ga / chân ga, tránh thốc ga đột ngột và phanh gấp liên tục.
  2. Duy trì áp suất lốp đúng chuẩn (lốp non hơi làm tăng 5 - 10% mức tiêu thụ).
  3. Vệ sinh lọc gió động cơ mỗi 5.000 km và thay mới ở mốc 15.000 - 20.000 km.
  4. Đổ xăng buổi sáng sớm hoặc chiều tối khi nhiệt độ môi trường mát mẻ, xăng ít bị giãn nở bay hơi.`;
  }

  if (lower.includes('lốp') || lower.includes('áp suất') || lower.includes('vỏ xe')) {
    return `🛞 [Tư vấn lốp & Áp suất cho ${vName}]:
- Xe máy: Bánh trước thường từ 1.8 - 2.0 kg/cm² (26 - 29 PSI), bánh sau từ 2.2 - 2.5 kg/cm² (32 - 36 PSI).
- Ô tô: Thường từ 2.2 - 2.5 bar (31 - 36 PSI), kiểm tra tem dán ở khung cửa ghế lái.
- Định kỳ: Đảo lốp mỗi 10.000 km và thay lốp mới sau 40.000 - 50.000 km hoặc sau 5 năm sử dụng.`;
  }

  if (lower.includes('bugi') || lower.includes('đánh lửa')) {
    return `⚡ [Bảo dưỡng Bugi]:
- Bugi tiêu chuẩn (Nickel/Đồng): Nên kiểm tra vệ sinh mỗi 8.000 km và thay mới sau 12.000 - 15.000 km.
- Bugi cao cấp (Iridium / Platinum): Tuổi thọ từ 40.000 - 80.000 km đối với ô tô và 20.000 - 30.000 km đối với xe máy.
- Dấu hiệu cần thay: Xe khó nổ buổi sáng, hụt ga, giật cục khi tăng tốc hoặc khói đen.`;
  }

  if (lower.includes('phanh') || lower.includes('thắng') || lower.includes('bố thắng')) {
    return `🛑 [Hệ thống phanh]:
- Kiểm tra độ dày má phanh mỗi 5.000 km. Nếu má phanh mòn còn dưới 2mm thì cần thay ngay để tránh làm xước đĩa phanh.
- Thay dầu phanh (DOT 3 / DOT 4) sau mỗi 2 năm hoặc 20.000 km để đảm bảo áp suất thủy lực an toàn.`;
  }

  if (lower.includes('bảo dưỡng') || lower.includes('kiểm tra')) {
    return `🔧 [Lịch bảo dưỡng khuyến nghị cho ${vName} - Mốc ${odo.toLocaleString('vi-VN')} km]:
- Mốc 5.000 km: Thay nhớt, kiểm tra áp suất lốp, xích/dây curoa, tra mỡ chân chống.
- Mốc 10.000 km: Vệ sinh lọc gió, kiểm tra má phanh, ắc quy, nước làm mát.
- Mốc 15.000 - 20.000 km: Thay lọc gió, thay bugi, thay dầu phanh, vệ sinh buồng đốt / kim phun xăng điện tử (FI).`;
  }

  return `🚗 [Trợ lý Lái Xe Veo Copilot - Xe ${vName}]:
Tôi đã ghi nhận câu hỏi của bạn. Phương tiện "${vName}" hiện đang ghi nhận Odo: ${odo.toLocaleString('vi-VN')} km.
Bạn có thể hỏi tôi bất kỳ điều gì về:
1. Mức tiêu hao xăng thực tế & kinh nghiệm lái tiết kiệm.
2. Mốc thay nhớt máy, nhớt số, lọc gió, bugi, má phanh.
3. Hướng dẫn ra lệnh bằng giọng nói: "lệnh: đổ xăng, giá tiền: 500k" hoặc "thay nhớt 250k".
Copilot luôn sẵn sàng đồng hành cùng bạn trên mọi cung đường!`;
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
    const prompt = `Bạn là Trợ lý lái xe thông minh Veo Copilot của ứng dụng Veo App.
Hãy trò chuyện, tư vấn kỹ thuật xe ô tô/xe máy, kinh nghiệm lái xe thực tế, mẹo tiết kiệm nhiên liệu, nhắc bảo dưỡng phụ tùng định kỳ hoặc giải đáp thắc mắc của chủ xe.
Giọng điệu: Thân thiện, thực tế, chuyên nghiệp, ngôn ngữ tiếng Việt tự nhiên và súc tích. Tuyệt đối không nhắc tới phi thuyền, không gian hay viễn tưởng.

Dữ liệu phương tiện và thông số hiện tại:
${contextStr}

Yêu cầu người dùng:
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
