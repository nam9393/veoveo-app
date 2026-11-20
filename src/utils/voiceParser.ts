import { EntryType } from '../types';

export interface ParsedCommand {
  type: EntryType;
  amount: number;
  odo?: number;
  note?: string;
  price?: number;
  liters?: number;
  full?: boolean;
  ft?: string;
  partName?: string;
  explanation?: string;
  source: 'fast-keyword' | 'gemini-ai';
}

// Convert Vietnamese spoken words or digits to number
export function parseVietnameseAmount(str: string): number {
  const clean = str.toLowerCase().replace(/[,.\s]/g, '');

  // 1. Spoken Vietnamese phrase mapping
  const spoken = str.toLowerCase();
  if (spoken.includes('một triệu') || spoken.includes('1 triệu')) {
    if (spoken.includes('năm trăm') || spoken.includes('500')) return 1500000;
    if (spoken.includes('hai trăm') || spoken.includes('200')) return 1200000;
    return 1000000;
  }
  if (spoken.includes('hai triệu') || spoken.includes('2 triệu')) return 2000000;
  if (spoken.includes('năm trăm') || spoken.includes('500k') || spoken.includes('500 nghìn') || spoken.includes('500 ngàn')) return 500000;
  if (spoken.includes('bốn trăm') || spoken.includes('400k')) return 400000;
  if (spoken.includes('ba trăm năm mươi') || spoken.includes('350k')) return 350000;
  if (spoken.includes('ba trăm') || spoken.includes('300k')) return 300000;
  if (spoken.includes('hai trăm năm mươi') || spoken.includes('250k')) return 250000;
  if (spoken.includes('hai trăm') || spoken.includes('200k')) return 200000;
  if (spoken.includes('một trăm năm mươi') || spoken.includes('150k')) return 150000;
  if (spoken.includes('một trăm') || spoken.includes('100k')) return 100000;
  if (spoken.includes('tám mươi') || spoken.includes('80k')) return 80000;
  if (spoken.includes('năm mươi') || spoken.includes('50k')) return 50000;
  if (spoken.includes('ba mươi') || spoken.includes('30k')) return 30000;
  if (spoken.includes('hai mươi') || spoken.includes('20k')) return 20000;
  
  // Match "1tr5" or "1.5tr"
  const trMatch = clean.match(/(\d+)(?:tr|trieu|triệu)(\d*)/);
  if (trMatch) {
    const main = parseInt(trMatch[1], 10) * 1000000;
    const sub = trMatch[2] ? parseInt(trMatch[2].padEnd(6, '0').slice(0, 6), 10) : 0;
    return main + sub;
  }

  // Match "500k", "500nghin", "500ngan"
  const kMatch = clean.match(/(\d+)(?:k|nghin|nghìn|ngan|ngàn)/);
  if (kMatch) {
    return parseInt(kMatch[1], 10) * 1000;
  }

  // Pure digits
  const numMatch = clean.match(/(\d+)/);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    // If under 1000, probably meant thousands (e.g. 500 -> 500.000)
    if (val > 0 && val < 1000 && !clean.includes('lit') && !clean.includes('lít') && !clean.includes('km')) {
      return val * 1000;
    }
    return val;
  }

  return 0;
}

// Instant Keyword & Keyword-Pattern Parser (offline, zero latency)
export function parseVoiceKeywordCommand(transcript: string, currentOdo?: number): ParsedCommand | null {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return null;

  let type: EntryType = 'fuel';
  let amount = 0;
  let odo: number | undefined = undefined;
  let note = '';
  let full = true;
  let partName: string | undefined = undefined;
  let liters: number | undefined = undefined;
  let price: number | undefined = undefined;
  let ft: string | undefined = undefined;

  // 1. Determine Tab/Type
  if (
    lower.includes('lệnh: đổ xăng') ||
    lower.includes('lệnh đổ xăng') ||
    lower.includes('đổ xăng') ||
    lower.includes('nhiên liệu') ||
    lower.includes('xăng')
  ) {
    type = 'fuel';
  } else if (
    lower.includes('lệnh: bảo dưỡng') ||
    lower.includes('lệnh bảo dưỡng') ||
    lower.includes('bảo dưỡng') ||
    lower.includes('thay nhớt') ||
    lower.includes('sửa xe') ||
    lower.includes('phụ tùng') ||
    lower.includes('thay lốp') ||
    lower.includes('thay bugi')
  ) {
    type = 'service';
  } else if (
    lower.includes('thu nhập') ||
    lower.includes('chở khách') ||
    lower.includes('chạy xe') ||
    lower.includes('kiếm được') ||
    lower.includes('tiền thu')
  ) {
    type = 'income';
  } else if (
    lower.includes('chi phí khác') ||
    lower.includes('gửi xe') ||
    lower.includes('vé cầu đường') ||
    lower.includes('rửa xe') ||
    lower.includes('bảo hiểm') ||
    lower.includes('phạt')
  ) {
    type = 'other';
  }

  // 2. Extract Amount
  // Pattern: "giá tiền: 500k" or "giá tiền 500k" or "tiền: 500k" or "hết 500k"
  const priceLabelMatch = lower.match(/(?:giá tiền|số tiền|tiền|chi phí|hết|mất|được)(?:\s*[:]\s*|\s+)([0-9.,]+\s*(?:k|nghìn|ngàn|tr|triệu|đ|vnd)?)/);
  if (priceLabelMatch) {
    amount = parseVietnameseAmount(priceLabelMatch[1]);
  } else {
    // Look for any amount pattern (e.g., 500k, 250.000, 1tr)
    const genericAmountMatch = lower.match(/(\d+[\d.,]*\s*(?:k|nghìn|ngàn|tr|triệu))/);
    if (genericAmountMatch) {
      amount = parseVietnameseAmount(genericAmountMatch[1]);
    }
  }

  // 3. Extract Odometer km
  const odoMatch = lower.match(/(?:tại km|mốc km|ở km|số km|km|mốc)(?:\s*[:]\s*|\s+)(\d+[\d.,]*)/);
  if (odoMatch) {
    odo = parseInt(odoMatch[1].replace(/\D/g, ''), 10);
  } else if (currentOdo) {
    odo = currentOdo;
  }

  // 4. Extract Fuel Details
  if (type === 'fuel') {
    if (lower.includes('không đầy bình') || lower.includes('nửa bình')) {
      full = false;
    }
    if (lower.includes('e10')) ft = 'e10';
    else if (lower.includes('e5')) ft = 'e5';
    else if (lower.includes('ron 95') || lower.includes('ron95') || lower.includes('95')) ft = 'ron95';

    // Check for liters if specified (e.g. "4 lít", "4.5l")
    const litMatch = lower.match(/(\d+[.,]?\d*)\s*(?:lít|lit|l\b)/);
    if (litMatch) {
      liters = parseFloat(litMatch[1].replace(',', '.'));
    }

    // Check for unit price if specified (e.g. "đơn giá 23k", "giá 24000/lít")
    const unitPriceMatch = lower.match(/(?:đơn giá|giá xăng|giá mỗi lít)(?:\s*[:]\s*|\s+)(\d+[\d.,]*\s*(?:k|nghìn)?)/);
    if (unitPriceMatch) {
      price = parseVietnameseAmount(unitPriceMatch[1]);
    }

    note = `Đổ xăng ${ft ? ft.toUpperCase() : ''}${full ? ' (đầy bình)' : ''}`.trim();
  }

  // 5. Extract Service Part Details
  if (type === 'service') {
    const partsList = [
      { key: 'nhớt', name: 'Nhớt máy' },
      { key: 'dầu máy', name: 'Nhớt máy' },
      { key: 'bugi', name: 'Bugi' },
      { key: 'lọc gió', name: 'Lọc gió động cơ' },
      { key: 'lọc nhớt', name: 'Lọc nhớt' },
      { key: 'má phanh', name: 'Má phanh' },
      { key: 'bố thắng', name: 'Má phanh' },
      { key: 'dầu phanh', name: 'Dầu phanh' },
      { key: 'lốp', name: 'Lốp xe' },
      { key: 'vỏ xe', name: 'Lốp xe' },
      { key: 'ắc quy', name: 'Ắc quy' },
      { key: 'bình điện', name: 'Ắc quy' },
      { key: 'dây curoa', name: 'Dây curoa' },
      { key: 'xích', name: 'Xích / sên' },
      { key: 'nước làm mát', name: 'Nước làm mát' },
    ];

    for (const p of partsList) {
      if (lower.includes(p.key)) {
        partName = p.name;
        break;
      }
    }

    // Note from transcript
    const noteMatch = lower.match(/(?:nội dung|làm gì|hạng mục|bảo dưỡng)(?:\s*[:]\s*|\s+)([^,.;]+)/);
    if (noteMatch) {
      note = noteMatch[1].trim();
    } else {
      note = partName ? `Thay ${partName.toLowerCase()}` : 'Bảo dưỡng định kỳ';
    }
  }

  // 6. Other or Income Notes
  if (type === 'other') {
    if (lower.includes('gửi xe')) note = 'Phí gửi xe';
    else if (lower.includes('cầu đường') || lower.includes('bot')) note = 'Phí cầu đường BOT';
    else if (lower.includes('rửa xe')) note = 'Rửa xe';
    else if (lower.includes('bảo hiểm')) note = 'Bảo hiểm xe';
    else note = 'Chi phí đi lại';
  }

  if (type === 'income') {
    if (lower.includes('grab') || lower.includes('be') || lower.includes('chạy xe')) {
      note = 'Chạy xe công nghệ';
    } else if (lower.includes('chở hàng') || lower.includes('giao hàng')) {
      note = 'Chở hàng / Giao hàng';
    } else if (lower.includes('cho thuê')) {
      note = 'Cho thuê xe';
    } else {
      note = 'Thu nhập từ xe';
    }
  }

  // Valid parsed command requires either amount > 0 or a recognized command intent
  if (amount > 0 || lower.includes('lệnh:')) {
    return {
      type,
      amount,
      odo,
      note,
      full,
      liters,
      price,
      ft,
      partName,
      source: 'fast-keyword',
      explanation: `Hệ thống nhận diện lệnh: ${type === 'fuel' ? 'Đổ xăng' : type === 'service' ? 'Bảo dưỡng' : type === 'income' ? 'Thu nhập' : 'Chi phí'} ${amount ? amount.toLocaleString('vi-VN') + ' VNĐ' : ''}.`,
    };
  }

  return null;
}

// Call Gemini AI directly from client or fallback
import { parseCommandWithGemini } from '../services/geminiService';

export async function parseWithGeminiAI(
  text: string,
  currentOdo: number,
  vehicleName: string
): Promise<ParsedCommand | null> {
  return parseCommandWithGemini(text, currentOdo, vehicleName);
}
