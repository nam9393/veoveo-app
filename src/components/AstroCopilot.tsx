import React, { useState, useEffect, useRef } from 'react';
import { ParsedCommand, parseVoiceKeywordCommand, parseWithGeminiAI } from '../utils/voiceParser';
import { playChimeSound, playConfirmSound } from '../utils/sound';
import { Vehicle } from '../types';

interface AstroCopilotProps {
  currentVehicle: Vehicle | null;
  currentOdo: number;
  soundEnabled: boolean;
  onApplyCommand: (cmd: ParsedCommand) => void;
}

export const AstroCopilot: React.FC<AstroCopilotProps> = ({
  currentVehicle,
  currentOdo,
  soundEnabled,
  onApplyCommand,
}) => {
  // Command input voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // AI Chat state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'copilot'; text: string; id: string }>>([
    {
      id: 'init-msg',
      sender: 'copilot',
      text: 'Xin chào bạn! Tôi là Trợ lý Lái xe Veo AI. Hãy bấm micro để ra lệnh bằng giọng nói (ví dụ: "đổ xăng 500k", "thay nhớt máy 250k mốc 15000 km") hoặc trò chuyện hỏi đáp kỹ thuật trực tiếp bằng giọng nói!',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Voice Chat (STT & TTS) state inside AI Q&A
  const [isChatListening, setIsChatListening] = useState(false);
  const [chatTranscript, setChatTranscript] = useState('');
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('soxe_tts') !== '0';
    } catch {
      return true;
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);

  const commandRecognitionRef = useRef<any>(null);
  const chatRecognitionRef = useRef<any>(null);
  const commandSilenceTimerRef = useRef<any>(null);
  const chatSilenceTimerRef = useRef<any>(null);
  const latestCommandTranscriptRef = useRef<string>('');
  const latestChatTranscriptRef = useRef<string>('');

  // Clean text from symbols before reading with TTS
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/[#*_`~>]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
      .trim();
  };

  // Text-to-Speech function for AI responses
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleaned = cleanForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.02;
      utterance.pitch = 1.0;

      // Try finding a Vietnamese voice if available
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleToggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    if (!next) stopSpeaking();
    try {
      localStorage.setItem('soxe_tts', next ? '1' : '0');
    } catch {}
  };

  // Local Copilot Knowledge Fallback for Client (instant, realistic automotive advice)
  const getClientFallbackAdvice = (msg: string): string => {
    const lower = msg.toLowerCase();
    const vName = currentVehicle?.name || 'xe của bạn';
    const odo = currentOdo || 0;

    if (lower.includes('nhớt') || lower.includes('dầu')) {
      return `🛢️ [Tư vấn nhớt ${vName}]:
- Xe máy: Thay sau mỗi 1.500 - 2.000 km (nhớt khoáng/bán tổng hợp) hoặc 3.000 - 4.000 km (nhớt 100% tổng hợp cao cấp).
- Ô tô: Thay sau mỗi 5.000 km (nhớt thông thường) hoặc 10.000 km (nhớt tổng hợp toàn phần). Nên thay lọc nhớt sau mỗi 2 lần thay dầu máy.
- Mốc km hiện tại của bạn: ${odo.toLocaleString('vi-VN')} km.`;
    }
    if (lower.includes('xăng') || lower.includes('tiết kiệm') || lower.includes('tiêu hao')) {
      return `⛽ [Mức tiêu hao & Mẹo tiết kiệm xăng cho ${vName}]:
- Duy trì tay ga/chân ga đều đặn ở dải tốc độ kinh tế 40 - 70 km/h.
- Đảm bảo áp suất lốp đủ chuẩn (lốp non làm tăng 5-10% hao xăng).
- Vệ sinh lọc gió định kỳ mỗi 5.000 km và thay mới ở mốc 15.000 - 20.000 km.
- Đổ xăng vào buổi sáng sớm hoặc chiều mát khi nhiệt độ thấp, xăng đặc và ít bay hơi.`;
    }
    if (lower.includes('lốp') || lower.includes('áp suất')) {
      return `🛞 [Tư vấn áp suất lốp xe]:
- Xe máy: Bánh trước ~2.0 kg/cm² (29 PSI), bánh sau ~2.3 kg/cm² (33 PSI).
- Ô tô: Thường từ 2.2 - 2.5 bar (31 - 36 PSI). Nên đảo lốp mỗi 10.000 km và thay lốp sau 40.000 - 50.000 km.`;
    }
    if (lower.includes('bugi') || lower.includes('đánh lửa')) {
      return `⚡ [Bảo dưỡng Bugi]:
- Kiểm tra vệ sinh mỗi 8.000 km và thay mới ở mốc 12.000 - 15.000 km (bugi tiêu chuẩn).
- Bugi Iridium cao cấp có thể chạy 30.000 - 50.000 km mới cần thay.`;
    }
    if (lower.includes('phanh') || lower.includes('thắng')) {
      return `🛑 [Hệ thống phanh]:
- Kiểm tra độ mòn má phanh định kỳ mỗi 5.000 km.
- Thay dầu phanh (DOT 3 / DOT 4) sau mỗi 2 năm hoặc 20.000 km để đảm bảo áp suất thủy lực an toàn.`;
    }
    return `🚗 [Trợ lý Lái Xe Veo Copilot - Xe ${vName}]:
Tôi đã ghi nhận câu hỏi của bạn. Phương tiện "${vName}" hiện đang ở mốc Odo: ${odo.toLocaleString('vi-VN')} km.
Bạn có thể hỏi tôi về:
1. Mẹo tiết kiệm xăng & mức tiêu hao thực tế.
2. Chu kỳ thay nhớt máy, nhớt hộp số, lọc gió, bugi, má phanh.
3. Ra lệnh giọng nói tự động điền: "lệnh: đổ xăng, giá tiền 500k" hoặc "thay nhớt 250k".`;
  };

  const processTextCommand = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    setIsProcessing(true);
    setStatusMessage('⚡ Veo Copilot đang phân tích câu lệnh...');

    // 1. Fast offline keyword check first
    const fastParsed = parseVoiceKeywordCommand(text, currentOdo);
    if (fastParsed && fastParsed.amount > 0) {
      playConfirmSound(soundEnabled);
      setIsProcessing(false);
      setStatusMessage(`✨ Đã tự động điền: ${fastParsed.explanation}`);
      onApplyCommand(fastParsed);
      setCommandInput('');
      setTranscript('');
      latestCommandTranscriptRef.current = '';
      return;
    }

    // 2. Deep Gemini AI parsing
    try {
      const geminiParsed = await parseWithGeminiAI(
        text,
        currentOdo,
        currentVehicle?.name || 'Phương tiện'
      );
      if (geminiParsed && (geminiParsed.amount > 0 || geminiParsed.note)) {
        playConfirmSound(soundEnabled);
        setStatusMessage(`🚗 Đã tự động điền: ${geminiParsed.explanation || 'Đã áp dụng vào form!'}`);
        onApplyCommand(geminiParsed);
        setCommandInput('');
        setTranscript('');
        latestCommandTranscriptRef.current = '';
      } else {
        setStatusMessage(
          'Chưa rõ số tiền. Hãy nói rõ: "lệnh: đổ xăng, giá tiền: 500k" hoặc "thay nhớt 250k".'
        );
      }
    } catch {
      if (fastParsed) {
        playConfirmSound(soundEnabled);
        setStatusMessage(`✨ Tự động nhận diện: ${fastParsed.explanation}`);
        onApplyCommand(fastParsed);
      } else {
        setStatusMessage('Đã nhận lệnh thoại, bạn có thể kiểm tra và lưu vào sổ chi tiêu.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Setup Command Voice Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('🎙️ Đang lắng nghe... Nói tự nhiên, hệ thống sẽ tự động điền khi bạn dứt câu!');
        playChimeSound(soundEnabled);
      };

      recognition.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript + ' ';
          } else {
            interimText += res[0].transcript;
          }
        }

        const combinedText = (finalText + interimText).trim();
        setTranscript(combinedText);
        setCommandInput(combinedText);
        latestCommandTranscriptRef.current = combinedText;

        if (commandSilenceTimerRef.current) clearTimeout(commandSilenceTimerRef.current);
        commandSilenceTimerRef.current = setTimeout(() => {
          if (latestCommandTranscriptRef.current.trim()) {
            setStatusMessage('⚡ Đã nhận diện xong câu nói, đang tự động điền...');
            if (commandRecognitionRef.current) {
              try {
                commandRecognitionRef.current.stop();
              } catch {}
            }
            setIsListening(false);
            processTextCommand(latestCommandTranscriptRef.current);
          }
        }, 1600);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event?.error);
        if (event?.error !== 'no-speech') {
          setIsListening(false);
          setStatusMessage('Không thu được âm thanh rõ. Bạn có thể nhấn mic để nói lại.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      commandRecognitionRef.current = recognition;
    }

    return () => {
      if (commandSilenceTimerRef.current) clearTimeout(commandSilenceTimerRef.current);
    };
  }, [soundEnabled, currentOdo, currentVehicle?.name]);

  // Setup AI Chat Voice Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const chatRec = new SpeechRecognition();
      chatRec.continuous = true;
      chatRec.interimResults = true;
      chatRec.lang = 'vi-VN';

      chatRec.onstart = () => {
        setIsChatListening(true);
        stopSpeaking();
        playChimeSound(soundEnabled);
      };

      chatRec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript + ' ';
          } else {
            interimText += res[0].transcript;
          }
        }

        const combinedText = (finalText + interimText).trim();
        setChatTranscript(combinedText);
        setChatInput(combinedText);
        latestChatTranscriptRef.current = combinedText;

        // Auto-send when silence detected in chat mode
        if (chatSilenceTimerRef.current) clearTimeout(chatSilenceTimerRef.current);
        chatSilenceTimerRef.current = setTimeout(() => {
          if (latestChatTranscriptRef.current.trim()) {
            if (chatRecognitionRef.current) {
              try {
                chatRecognitionRef.current.stop();
              } catch {}
            }
            setIsChatListening(false);
            executeChatQuery(latestChatTranscriptRef.current);
          }
        }, 1700);
      };

      chatRec.onerror = (event: any) => {
        if (event?.error !== 'no-speech') {
          setIsChatListening(false);
        }
      };

      chatRec.onend = () => {
        setIsChatListening(false);
      };

      chatRecognitionRef.current = chatRec;
    }

    return () => {
      if (chatSilenceTimerRef.current) clearTimeout(chatSilenceTimerRef.current);
    };
  }, [soundEnabled, currentOdo, currentVehicle]);

  const handleToggleCommandMic = () => {
    if (!commandRecognitionRef.current) {
      setStatusMessage('Trình duyệt chưa hỗ trợ Web Speech API. Bạn có thể gõ trực tiếp câu lệnh.');
      return;
    }

    if (isListening) {
      if (commandSilenceTimerRef.current) clearTimeout(commandSilenceTimerRef.current);
      commandRecognitionRef.current.stop();
      setIsListening(false);
      if (latestCommandTranscriptRef.current.trim()) {
        processTextCommand(latestCommandTranscriptRef.current);
      }
    } else {
      setTranscript('');
      latestCommandTranscriptRef.current = '';
      setStatusMessage('Đang kích hoạt micro... Hãy đọc đủ thông tin (ví dụ: "lệnh: đổ xăng, giá tiền: 500k")');
      try {
        commandRecognitionRef.current.start();
      } catch {
        commandRecognitionRef.current.stop();
        setTimeout(() => {
          try {
            commandRecognitionRef.current.start();
          } catch {}
        }, 200);
      }
    }
  };

  const handleToggleChatMic = () => {
    if (!chatRecognitionRef.current) {
      alert('Trình duyệt của bạn chưa bật nhận diện giọng nói Web Speech.');
      return;
    }

    if (isChatListening) {
      if (chatSilenceTimerRef.current) clearTimeout(chatSilenceTimerRef.current);
      chatRecognitionRef.current.stop();
      setIsChatListening(false);
      if (latestChatTranscriptRef.current.trim()) {
        executeChatQuery(latestChatTranscriptRef.current);
      }
    } else {
      stopSpeaking();
      setChatTranscript('');
      latestChatTranscriptRef.current = '';
      try {
        chatRecognitionRef.current.start();
      } catch {
        chatRecognitionRef.current.stop();
        setTimeout(() => {
          try {
            chatRecognitionRef.current.start();
          } catch {}
        }, 200);
      }
    }
  };

  const executeChatQuery = async (queryText: string) => {
    const userText = queryText.trim();
    if (!userText || isChatLoading) return;

    setChatInput('');
    setChatTranscript('');
    latestChatTranscriptRef.current = '';
    const userMsgId = 'u-' + Date.now();
    setAiMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: userText }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          context: {
            vehicleName: currentVehicle?.name,
            plate: currentVehicle?.plate,
            currentOdo,
            tank: currentVehicle?.tank,
            cons: currentVehicle?.cons,
          },
        }),
      });

      const data = await res.json();
      const replyText = data && data.reply ? data.reply : getClientFallbackAdvice(userText);
      const aiMsgId = 'ai-' + Date.now();
      setAiMessages((prev) => [...prev, { id: aiMsgId, sender: 'copilot', text: replyText }]);

      if (ttsEnabled) {
        speakText(replyText);
      }
    } catch {
      const fallback = getClientFallbackAdvice(userText);
      const aiMsgId = 'ai-' + Date.now();
      setAiMessages((prev) => [...prev, { id: aiMsgId, sender: 'copilot', text: fallback }]);
      if (ttsEnabled) {
        speakText(fallback);
      }
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendChatForm = (e: React.FormEvent) => {
    e.preventDefault();
    executeChatQuery(chatInput);
  };

  return (
    <div
      className="card"
      style={{
        background: 'linear-gradient(145deg, rgba(10, 16, 32, 0.94), rgba(255, 255, 255, 0.02))',
        borderColor: isListening ? 'var(--acc)' : 'var(--line)',
        boxShadow: isListening
          ? '0 4px 20px var(--card-glow)'
          : undefined,
        marginBottom: '14px',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🚗</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '14.5px', color: 'var(--acc)' }}>
              Trợ Lý Xe Ô Tô AI · Giọng Nói Hai Chiều
            </h2>
            <small style={{ color: 'var(--mut)', fontSize: '11px' }}>
              Tự động lắng nghe & Tự động điền form khi dứt câu (không cần bấm nạp)
            </small>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setAiChatOpen((prev) => !prev);
            stopSpeaking();
          }}
          style={{
            fontSize: '12px',
            padding: '5px 11px',
            background: aiChatOpen ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            borderColor: 'var(--line)',
            color: '#f8fafc',
            fontWeight: 600,
          }}
        >
          💬 {aiChatOpen ? 'Đóng hỏi đáp' : 'Hỏi đáp AI bằng Giọng nói'}
        </button>
      </div>

      {/* Voice Quick Command Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleToggleCommandMic}
          title={isListening ? 'Bấm để dừng và điền ngay' : 'Bật micro ra lệnh giọng nói'}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            padding: 0,
            flexShrink: 0,
            background: isListening
              ? '#ef4444'
              : 'var(--acc)',
            borderColor: isListening ? '#f87171' : 'var(--acc)',
            boxShadow: isListening
              ? '0 4px 14px rgba(239, 68, 68, 0.4)'
              : '0 4px 14px var(--card-glow)',
            color: isListening ? '#fff' : 'var(--accT)',
            fontSize: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {isListening ? '⏹️' : '🎙️'}
        </button>

        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder='Đọc hoặc gõ: "lệnh: đổ xăng, giá tiền: 500k" hoặc "thay nhớt 250k"'
            value={commandInput}
            onChange={(e) => {
              setCommandInput(e.target.value);
              latestCommandTranscriptRef.current = e.target.value;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                processTextCommand(commandInput);
              }
            }}
            style={{
              width: '100%',
              borderColor: isListening ? 'var(--acc)' : undefined,
              paddingRight: isProcessing ? '40px' : '10px',
            }}
          />
          {isProcessing && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '14px',
                color: 'var(--acc)',
              }}
            >
              ⚡
            </div>
          )}
        </div>
      </div>

      {/* Live Voice Waves & Status */}
      {isListening && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
          <div className="voice-wave">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <span style={{ fontSize: '12.5px', color: '#00f0ff', fontStyle: 'italic' }}>
            {transcript || 'Nói tự nhiên: "lệnh: đổ xăng 500k ron95" hoặc "bảo dưỡng bugi 120k"...'}
          </span>
        </div>
      )}

      {statusMessage && !isListening && (
        <div
          style={{
            fontSize: '12px',
            color: '#a5f3fc',
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(0, 240, 255, 0.08)',
            borderLeft: '3px solid #00f0ff',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Suggested Quick Commands */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
        <small style={{ color: 'var(--mut)', alignSelf: 'center', fontSize: '11px', marginRight: '4px' }}>
          Lệnh mẫu:
        </small>
        {[
          'lệnh: đổ xăng, giá tiền: 500k',
          'bảo dưỡng thay nhớt 250k',
          'đổ xăng 400k ron95',
          'rửa xe bọt tuyết 80k',
          'thu nhập chạy xe 450k',
        ].map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => {
              setCommandInput(cmd);
              processTextCommand(cmd);
            }}
            style={{
              padding: '3px 8px',
              fontSize: '11.5px',
              borderRadius: '6px',
              background: 'rgba(6, 16, 36, 0.7)',
              borderColor: 'rgba(0, 240, 255, 0.2)',
              color: '#cce6ff',
            }}
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Two-Way AI Voice & Text Chat Panel */}
      {aiChatOpen && (
        <div
          style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(0, 240, 255, 0.2)',
          }}
        >
          {/* Voice Chat Controls Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '10px',
              padding: '4px 8px',
              borderRadius: '8px',
              background: 'rgba(5, 12, 28, 0.7)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00f0ff', fontWeight: 700 }}>🎙️ Trò chuyện Giọng Nói 2 Chiều</span>
              {isSpeaking && (
                <span style={{ color: '#00ff88', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="dot" style={{ background: '#00ff88' }} /> Đang nói...
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    background: 'rgba(255, 51, 102, 0.2)',
                    borderColor: '#ff3366',
                    color: '#ff6688',
                  }}
                >
                  ⏹️ Dừng đọc
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleTts}
                title={ttsEnabled ? 'Tắt tính năng AI đọc câu trả lời' : 'Bật tính năng AI đọc câu trả lời'}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  background: ttsEnabled ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: ttsEnabled ? '#00ff88' : 'rgba(255, 255, 255, 0.2)',
                  color: ttsEnabled ? '#00ff88' : 'var(--mut)',
                }}
              >
                {ttsEnabled ? '🔊 Đọc to: Bật' : '🔇 Đọc to: Tắt'}
              </button>
            </div>
          </div>

          {/* Chat Messages Log */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '10px',
              paddingRight: '4px',
            }}
          >
            {aiMessages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  lineHeight: '1.5',
                  background:
                    m.sender === 'user'
                      ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
                      : 'rgba(12, 22, 42, 0.95)',
                  color: m.sender === 'user' ? '#ffffff' : '#e2f1ff',
                  border: m.sender === 'copilot' ? '1px solid rgba(0, 240, 255, 0.25)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <b>{m.sender === 'user' ? 'Bạn' : '🚗 Trợ lý Lái Xe'}:</b>
                  {m.sender === 'copilot' && (
                    <button
                      type="button"
                      onClick={() => speakText(m.text)}
                      title="Đọc lại câu trả lời"
                      style={{
                        padding: '1px 5px',
                        fontSize: '10px',
                        background: 'none',
                        border: 'none',
                        color: '#00f0ff',
                        cursor: 'pointer',
                      }}
                    >
                      🔊 Đọc lại
                    </button>
                  )}
                </div>
                <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
              </div>
            ))}

            {isChatLoading && (
              <div style={{ color: '#00f0ff', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot" style={{ background: '#00f0ff' }} /> Trợ lý AI đang tra cứu kỹ thuật xe và phân tích...
              </div>
            )}
          </div>

          {/* Active Chat Voice Listening Wave */}
          {isChatListening && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 10px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid #00f0ff',
              }}
            >
              <div className="voice-wave">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <span style={{ fontSize: '12px', color: '#00f0ff' }}>
                {chatTranscript || 'Đang lắng nghe câu hỏi của bạn... Khi bạn dừng nói, AI sẽ tự động trả lời!'}
              </span>
            </div>
          )}

          {/* Chat Form with Dedicated Voice Input Button */}
          <form onSubmit={handleSendChatForm} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleToggleChatMic}
              title={isChatListening ? 'Dừng nói và gửi ngay' : 'Bấm để nói câu hỏi bằng giọng nói'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                padding: 0,
                flexShrink: 0,
                background: isChatListening
                  ? 'radial-gradient(circle, #ff0055 30%, #b91c1c 100%)'
                  : 'radial-gradient(circle, #00f0ff 20%, #0284c7 100%)',
                borderColor: isChatListening ? '#ff3366' : '#00f0ff',
                color: '#fff',
                fontSize: '16px',
                boxShadow: isChatListening ? '0 0 16px #ff0055' : '0 0 10px rgba(0, 240, 255, 0.5)',
              }}
            >
              {isChatListening ? '⏹️' : '🎙️'}
            </button>

            <input
              type="text"
              placeholder="Nói hoặc gõ hỏi về mức tiêu hao, nhớt máy, kinh nghiệm lái..."
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                latestChatTranscriptRef.current = e.target.value;
              }}
              style={{ flex: 1, padding: '7px 10px', fontSize: '12.5px' }}
            />

            <button type="submit" className="pri" disabled={isChatLoading || !chatInput.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
export default AstroCopilot;
