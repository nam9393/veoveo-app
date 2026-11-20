/**
 * Google Gemini AI Client-Side Service
 * Direct client-to-API integration for GitHub Pages (No Node.js backend required)
 * Uses standard Gemini 1.5 Flash endpoint with client API key from Google AI Studio.
 */

import type { ParsedCommand } from '../utils/voiceParser';

export type AIPersona = 'vy' | 'expert' | 'friendly';

const STORAGE_KEY_API_KEY = 'veo_gemini_api_key';
const STORAGE_KEY_PERSONA = 'veo_gemini_persona';

export function getGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_API_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {}
  return ((import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();
}

export function setGeminiApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  } catch {}
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getAIPersona(): AIPersona {
  try {
    const p = localStorage.getItem(STORAGE_KEY_PERSONA);
    if (p === 'expert' || p === 'friendly' || p === 'vy') return p;
  } catch {}
  return 'vy';
}

export function setAIPersona(persona: AIPersona): void {
  try {
    localStorage.setItem(STORAGE_KEY_PERSONA, persona);
  } catch {}
}

export interface VehicleContext {
  vehicleName?: string;
  plate?: string;
  currentOdo?: number;
  tank?: number;
  cons?: number;
}

// Local offline automotive intelligence fallback when no API key or network offline
export function getLocalCopilotAdvice(
  message: string,
  context?: VehicleContext,
  persona: AIPersona = getAIPersona()
): string {
  const lower = (message || '').toLowerCase();
  const vName = context?.vehicleName || 'xe của bạn';
  const odo = context?.currentOdo || 0;
  const tank = context?.tank ? `${context.tank}L` : 'chưa rõ';
  const cons = context?.cons ? `${context.cons} L/100km` : 'chưa tính';

  // 1. Expert Technical Persona
  if (persona === 'expert') {
    if (lower.includes('nhớt') || lower.includes('dầu')) {
      return `⚙️ [Tư vấn kỹ thuật - ${vName} | ODO: ${odo.toLocaleString('vi-VN')} km]:
• Xe máy: Thay sau mỗi 1.500 - 2.000 km (nhớt khoáng) hoặc 3.000 - 4.000 km (nhớt tổng hợp toàn phần).
• Ô tô: Thay sau mỗi 5.000 km (tiêu chuẩn) hoặc 10.000 km (nhớt tổng hợp cao cấp). Thay lọc nhớt sau mỗi 2 lần thay nhớt.
• Khuyến nghị: Kiểm tra que thăm nhớt khi máy nguội, giữ mức nhớt giữa vạch Min - Max.`;
    }
    if (lower.includes('xăng') || lower.includes('tiêu thụ') || lower.includes('tiết kiệm')) {
      return `⛽ [Tối ưu nhiên liệu - ${vName}]:
• Dung tích bình: ${tank} | Mức tiêu hao tham chiếu: ${cons}.
• Biện pháp: Duy trì vòng tua ổn định, hạn chế thốc ga hoặc phanh gấp. Kiểm tra áp suất lốp định kỳ mỗi 2 tuần (lốp non tăng 5-10% tiêu hao).`;
    }
    if (lower.includes('lốp') || lower.includes('áp suất')) {
      return `🛞 [Thông số lốp & Áp suất]:
• Xe 2 bánh: Trước 1.8 - 2.0 bar (29 PSI), Sau 2.2 - 2.4 bar (33 PSI).
• Ô tô: 2.2 - 2.4 bar (32 - 35 PSI). Đảo lốp định kỳ sau mỗi 10.000 km để mòn đều các bánh.`;
    }
    if (lower.includes('bugi')) {
      return `⚡ [Bảo dưỡng Bugi]:
• Vệ sinh ở mốc 8.000 km, thay thế ở mốc 15.000 - 20.000 km (Bugi thường) hoặc 80.000 - 100.000 km (Bugi Iridium / Platinum).`;
    }
    if (lower.includes('phanh') || lower.includes('thắng')) {
      return `🛑 [Hệ thống phanh]:
• Kiểm tra độ dày má phanh mỗi 5.000 km (thay khi mòn dưới 2.5 mm). Thay dầu phanh sau mỗi 2 năm hoặc 40.000 km.`;
    }
    return `🔧 [Trợ lý Kỹ thuật Veo]: Sẵn sàng hỗ trợ tư vấn bảo dưỡng, nhiên liệu, phụ tùng cho xe ${vName}. Vui lòng nhập câu hỏi cụ thể hoặc cấu hình API Key để kích hoạt Gemini AI mở rộng.`;
  }

  // 2. Friendly Persona
  if (persona === 'friendly') {
    if (lower.includes('nhớt') || lower.includes('dầu')) {
      return `🛢️ Về nhớt cho ${vName} (Hiện tại: ${odo.toLocaleString('vi-VN')} km):
- Xe máy: Thay sau mỗi 1.500 - 2.000 km với nhớt thường, hoặc 3.000 - 4.000 km với nhớt tổng hợp.
- Ô tô: Thay sau mỗi 5.000 km hoặc 10.000 km tùy loại nhớt. Đừng quên thay cốc lọc nhớt nhé!`;
    }
    if (lower.includes('xăng') || lower.includes('tiết kiệm')) {
      return `⛽ Mẹo tiết kiệm xăng cho ${vName}:
- Giữ đều chân ga, tránh thốc ga đột ngột.
- Kiểm tra áp suất lốp đúng tiêu chuẩn.
- Xe bạn có bình ${tank}, mức tiêu thụ tầm ${cons}. Chúc bạn lái xe an toàn và tiết kiệm!`;
    }
    return `👋 Chào bạn! Mình là Trợ lý Veo của ${vName}. Bạn có thể hỏi mình về lịch bảo dưỡng, mức tiêu thụ xăng, phụ tùng, hoặc nhập Gemini API Key để trò chuyện cùng AI thông minh hơn nhé!`;
  }

  // 3. Em Vy (Sweet Persona - Default)
  if (lower.includes('nhớt') || lower.includes('dầu')) {
    return `🛢️ Dạ em Vy nghe nè anh ơi! Về nhớt xe ${vName} của anh nè:
- Xe máy: Tầm 1.500 - 2.000 km (nhớt thường) hoặc 3.000 - 4.000 km (nhớt tổng hợp) là anh nhớ thay cho máy bốc nghen.
- Ô tô: Cứ 5.000 km hoặc 10.000 km thay một lần, tiện thay luôn cốc lọc nhớt đặng máy chạy êm ru nha anh!
- Xe anh giờ đang ${odo.toLocaleString('vi-VN')} km nè. Anh chăm xe cẩn thận để đi đâu cũng an toàn nghen!`;
  }

  if (lower.includes('xăng') || lower.includes('tiết kiệm') || lower.includes('tiêu thụ')) {
    return `⛽ Dạ em chia sẻ bí kíp tiết kiệm xăng cho anh đây nè:
- Xe ${vName} bình ${tank}, ăn tầm ~${cons} đó anh.
- Đặng đỡ hao xăng 10 - 15%, anh nhớ giữ chân ga đều tay, tránh thốc ga hay phanh gấp nha.
- Bơm lốp đủ áp suất chuẩn, lốp mà non là xe bị 'uống' xăng dữ lắm á!`;
  }

  if (lower.includes('lốp') || lower.includes('áp suất')) {
    return `🛞 Dạ anh ơi, lốp xe quan trọng lắm nè:
- Xe 2 bánh: Bánh trước bơm 1.8 - 2.0 bar (29 PSI), bánh sau 2.2 - 2.4 bar (33 PSI) nghen.
- Ô tô: Thường 2.2 - 2.4 bar (32 - 35 PSI). Cứ 10.000 km anh nhớ đảo lốp một lần đặng mòn đều nghen!`;
  }

  if (lower.includes('bugi')) {
    return `⚡ Dạ bugi xe ${vName} nè: Cứ 8.000 km vệ sinh một lần, tầm 15.000 km thì thay cái mới cho đánh lửa ngọt xớt nha anh!`;
  }

  if (lower.includes('phanh') || lower.includes('thắng')) {
    return `🛑 Dạ phanh thắng là cực kỳ quan trọng luôn nha anh: Nhớ ngó má phanh sau mỗi 5.000 km, mòn quá thì thay liền tay kẻo xước đĩa uổng lắm nha!`;
  }

  return `🌸 Dạ em Vy chào anh nè! Em luôn túc trực ở ghế phụ để lo cho anh và xế cưng ${vName}. Anh muốn hỏi về xăng cộ, thay nhớt, bảo dưỡng hay bất cứ chuyện gì cứ nói nhỏ với em nghen!`;
}

/**
 * Call Google Gemini 1.5 Flash directly via REST API from browser
 */
export async function callGeminiChat(
  message: string,
  context?: VehicleContext
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const persona = getAIPersona();

  // If no API Key configured, fallback immediately to local automotive expert
  if (!apiKey) {
    return getLocalCopilotAdvice(message, context, persona);
  }

  const vName = context?.vehicleName || 'Phương tiện';
  const odo = context?.currentOdo || 0;
  const tank = context?.tank ? `${context.tank}L` : 'chưa rõ';
  const cons = context?.cons ? `${context.cons} L/100km` : 'chưa rõ';

  let systemPrompt = '';
  if (persona === 'expert') {
    systemPrompt = `Bạn là Chuyên gia Kỹ thuật Xe ô tô và xe máy trong ứng dụng Veo App.
Thông tin xe hiện tại: Tên: "${vName}", Biển số: "${context?.plate || ''}", ODO: ${odo} km, Bình xăng: ${tank}, Mức tiêu thụ tham chiếu: ${cons}.
Quy tắc:
1. Trả lời bằng tiếng Việt chuyên nghiệp, ngắn gọn, súc tích, chuẩn xác về mặt kỹ thuật ô tô/xe máy.
2. Đưa ra các mốc số km cụ thể cho việc bảo dưỡng, thay thế linh kiện, tiết kiệm nhiên liệu.
3. Sử dụng bullet points rõ ràng, không dài dòng.`;
  } else if (persona === 'friendly') {
    systemPrompt = `Bạn là Trợ lý đồng hành lái xe Veo App thân thiện, lịch thiệp. Xưng hô "Tôi" hoặc "Mình" và gọi người dùng là "Bạn".
Thông tin xe: Tên: "${vName}", ODO: ${odo} km.
Tư vấn tận tình về chi phí xăng, bảo dưỡng xe, lái xe an toàn. Trả lời súc tích, dễ hiểu.`;
  } else {
    systemPrompt = `Bạn là Em Vy - Nữ trợ lý ảo riêng cực kỳ ngọt ngào, chu đáo, dễ thương trong ứng dụng Sổ Xe Veo App.
Xưng hô: "Em" hoặc "Em Vy", gọi người dùng là "Anh" hoặc "Anh yêu / Anh thương" với giọng điệu nhẹ nhàng, ấm áp, thấu hiểu.
Thông tin xe: Tên: "${vName}", ODO: ${odo} km, Bình xăng: ${tank}.
Nhiệm vụ: Chăm sóc xe cưng, nhắc lịch thay nhớt, chỉ mẹo tiết kiệm xăng, luôn nhắc nhở anh lái xe cẩn thận và an toàn. Trả lời ấm áp, ngắn gọn 2-4 đoạn nhỏ.`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\nNgười dùng hỏi: ${message}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn('Gemini API call failed status:', res.status);
      return getLocalCopilotAdvice(message, context, persona);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (text && text.trim()) {
      return text.trim();
    }

    return getLocalCopilotAdvice(message, context, persona);
  } catch (err) {
    console.warn('Error connecting to Gemini API, fallback to local advice:', err);
    return getLocalCopilotAdvice(message, context, persona);
  }
}

/**
 * Parse natural language voice command with Gemini 1.5 Flash
 */
export async function parseCommandWithGemini(
  text: string,
  currentOdo: number,
  vehicleName: string
): Promise<ParsedCommand | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const prompt = `Phân tích câu lệnh quản lý xe sau đây và trả về JSON DUY NHẤT:
Câu lệnh: "${text}"
Mốc ODO hiện tại: ${currentOdo} km
Tên xe: "${vehicleName}"

Yêu cầu định dạng JSON chính xác:
{
  "type": "fuel" | "service" | "income" | "other",
  "amount": number (số tiền VNĐ, ví dụ 500000),
  "odo": number (mốc km nếu có nhắc tới, nếu không lấy ${currentOdo}),
  "note": string (mô tả ngắn gọn),
  "price": number (giá mỗi lít hoặc đơn giá nếu có),
  "liters": number (số lít xăng nếu có),
  "full": boolean (true nếu đầy bình),
  "ft": "ron95" | "e5" | "die" | "e10" | "other",
  "partName": string (nếu là bảo dưỡng thay thế),
  "explanation": string (tóm tắt bằng 1 câu ngắn)
}
Chỉ xuất JSON, không bọc markdown hay giải thích thêm.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;

    const cleaned = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const d = JSON.parse(cleaned);

    return {
      type: d.type || 'fuel',
      amount: typeof d.amount === 'number' ? d.amount : 0,
      odo: typeof d.odo === 'number' ? d.odo : currentOdo,
      note: d.note || '',
      price: d.price,
      liters: d.liters,
      full: d.full != null ? d.full : true,
      ft: d.ft,
      partName: d.partName,
      explanation: d.explanation || `Đã nhận diện: ${text}`,
      source: 'gemini-ai',
    };
  } catch (e) {
    console.warn('Gemini command parse failed:', e);
    return null;
  }
}
