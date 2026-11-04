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
      text: 'Dạ em chào anh yêu! Em là Vy - nữ trợ lý lái xe riêng cực kỳ chu đáo và quyến rũ của anh đây nè. Em luôn đồng hành bên cạnh anh trên mọi cung đường. Anh muốn em tư vấn mẹo tiết kiệm xăng, chu kỳ thay nhớt máy, hay có câu hỏi gì anh cứ nói với em nhé!',
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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const commandRecognitionRef = useRef<any>(null);
  const chatRecognitionRef = useRef<any>(null);
  const commandSilenceTimerRef = useRef<any>(null);
  const chatSilenceTimerRef = useRef<any>(null);
  const latestCommandTranscriptRef = useRef<string>('');
  const latestChatTranscriptRef = useRef<string>('');
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and load Speech Synthesis Voices with female Vietnamese preference
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const populateVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      if (!vList || vList.length === 0) return;
      setAvailableVoices(vList);

      const viVoices = vList.filter((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      // Look for natural female Vietnamese voices
      const femaleVi = viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('hoaimy') ||
          v.name.toLowerCase().includes('linh') ||
          v.name.toLowerCase().includes('mai') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('nữ') ||
          v.name.toLowerCase().includes('google')
      );
      if (femaleVi) {
        setSelectedVoiceName(femaleVi.name);
      } else if (viVoices.length > 0) {
        setSelectedVoiceName(viVoices[0].name);
      }
    };

    populateVoices();
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }, []);

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

  const ttsKeepAliveTimerRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);

  // Stop speaking and clear speech queue
  const stopSpeaking = () => {
    if (ttsKeepAliveTimerRef.current) {
      clearInterval(ttsKeepAliveTimerRef.current);
      ttsKeepAliveTimerRef.current = null;
    }
    speechQueueRef.current = [];
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {}
    }
  };

  // Speak next chunk in queue sequentially to bypass 15s browser cut-off
  const speakNextInQueue = () => {
    if (!('speechSynthesis' in window)) return;
    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
      if (ttsKeepAliveTimerRef.current) {
        clearInterval(ttsKeepAliveTimerRef.current);
        ttsKeepAliveTimerRef.current = null;
      }
      return;
    }

    const chunk = speechQueueRef.current.shift();
    if (!chunk || !chunk.trim()) {
      speakNextInQueue();
      return;
    }

    try {
      // Unfreeze browser speech engine
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(chunk.trim());
      utterance.lang = 'vi-VN';
      utterance.pitch = 1.15; // Sweet, charming feminine warmth
      utterance.rate = 0.95;  // Relaxed, pleasant cadence
      utterance.volume = 1.0;

      const allVoices = window.speechSynthesis.getVoices();
      const viVoices = allVoices.filter((v) => v.lang.startsWith('vi') || v.lang.includes('VIE'));
      const chosenVoice =
        allVoices.find((v) => v.name === selectedVoiceName) ||
        viVoices.find(
          (v) =>
            v.name.toLowerCase().includes('hoaimy') ||
            v.name.toLowerCase().includes('linh') ||
            v.name.toLowerCase().includes('mai') ||
            v.name.toLowerCase().includes('nữ') ||
            v.name.toLowerCase().includes('google')
        ) ||
        viVoices[0];

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        speakNextInQueue();
      };

      utterance.onerror = () => {
        speakNextInQueue();
      };

      // Heartbeat to prevent Chromium 15s speech freeze
      if (!ttsKeepAliveTimerRef.current) {
        ttsKeepAliveTimerRef.current = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 5000);
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
      speakNextInQueue();
    }
  };

  // Text-to-Speech function for AI responses (Gentle, Charming, Sexy Female Voice - Em Vy)
  const speakText = (text: string) => {
    stopSpeaking();
    const cleaned = cleanForSpeech(text);
    if (!cleaned) return;

    if (!('speechSynthesis' in window)) {
      console.warn('Trình duyệt chưa hỗ trợ SpeechSynthesis');
      return;
    }

    // Split text into natural sentence chunks (ends with . ! ? : or newline)
    const sentences = cleaned
      .replace(/([.?!:\n]+)/g, '$1|')
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    speechQueueRef.current = sentences.length > 0 ? sentences : [cleaned];
    isSpeakingRef.current = true;
    setIsSpeaking(true);

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
      setTimeout(() => {
        speakNextInQueue();
      }, 50);
    } catch {
      speakNextInQueue();
    }
  };

  const handleToggleTts = () => {
    const next = !ttsEnabled;
    setTtsEnabled(next);
    if (!next) stopSpeaking();
    try {
      localStorage.setItem('soxe_tts', next ? '1' : '0');
    } catch {}
  };

  const testSexyVoice = () => {
    speakText('Dạ em chào anh yêu! Em là Vy đây nè. Em luôn đồng hành bên cạnh anh, chúc anh một ngày lái xe thật an toàn và vui vẻ nha!');
  };

  // Local Copilot Knowledge Fallback for Client (instant, charming automotive advice)
  const getClientFallbackAdvice = (msg: string): string => {
    const lower = msg.toLowerCase();
    const vName = currentVehicle?.name || 'xe của anh';
    const odo = currentOdo || 0;

    if (lower.includes('nhớt') || lower.includes('dầu')) {
      return `🛢️ Dạ anh yêu ơi, về nhớt xe ${vName} của anh nè:
- Xe máy phổ thông: Anh thay sau mỗi 1.500 - 2.000 km (nhớt khoáng) hoặc 3.000 - 4.000 km (nhớt tổng hợp 100% Synthetic nha).
- Ô tô: Thay nhớt sau 5.000 km (thường) hoặc 10.000 km (tổng hợp cao cấp). Cứ 2 lần thay nhớt thì anh nhớ thay luôn lọc nhớt nhé.
- Mốc km hiện tại của anh: ${odo.toLocaleString('vi-VN')} km. Anh chăm xe cẩn thận để đi êm ru nha!`;
    }
    if (lower.includes('xăng') || lower.includes('tiết kiệm') || lower.includes('tiêu hao')) {
      return `⛽ Dạ em chia sẻ bí kíp tiết kiệm xăng cho anh yêu đây:
- Duy trì chân ga/tay ga đều đặn ở dải 40 - 70 km/h, hạn chế thốc ga bất ngờ.
- Bơm lốp đủ áp suất an toàn, lốp non sẽ làm xe anh tốn thêm 5-10% xăng đó ạ.
- Vệ sinh lọc gió định kỳ mỗi 5.000 km và đổ xăng vào sáng sớm khi thời tiết mát mẻ nhé anh!`;
    }
    if (lower.includes('lốp') || lower.includes('áp suất')) {
      return `🛞 Dạ anh yêu, áp suất lốp xe an toàn cho anh:
- Xe 2 bánh: Bánh trước ~2.0 bar (29 PSI), bánh sau ~2.3 bar (33 PSI).
- Ô tô: Thường 2.2 - 2.4 bar (32 - 35 PSI). Anh nhớ kiểm tra trước mỗi chuyến đi xa vì sự an toàn của anh là trên hết!`;
    }
    if (lower.includes('bugi') || lower.includes('đánh lửa')) {
      return `⚡ Dạ bugi xe ${vName} của anh:
- Vệ sinh mỗi 8.000 km và thay mới sau 12.000 - 15.000 km (bugi tiêu chuẩn).
- Nếu sáng sớm khó nổ là bugi muốn anh thay mới rồi đó anh yêu!`;
    }
    if (lower.includes('phanh') || lower.includes('thắng')) {
      return `🛑 Dạ hệ thống phanh xe của anh:
- Kiểm tra má phanh định kỳ mỗi 5.000 km, nếu mòn dưới 2mm thì anh thay ngay nhé.
- Thay dầu phanh sau mỗi 2 năm để phanh luôn ăn và an toàn tuyệt đối nha anh!`;
    }
    return `🚗 Dạ em nghe đây nè anh yêu! Em là Vy - trợ lý lái xe riêng của anh.
Xe "${vName}" của anh đang ở mốc ${odo.toLocaleString('vi-VN')} km.
Anh cần em xem mức tiêu hao xăng, lịch thay nhớt máy hay muốn trò chuyện chuyện gì, anh cứ nói với em nhé!`;
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
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '10px',
              padding: '6px 10px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(5, 12, 28, 0.8) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#f43f5e', fontWeight: 800 }}>💖 Em Vy · Giọng Nữ Ngọt Ngào Sexy</span>
              {isSpeaking && (
                <span style={{ color: '#00ff88', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <span className="dot" style={{ background: '#00ff88' }} /> Đang đọc...
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={testSexyVoice}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  background: 'rgba(244, 63, 94, 0.25)',
                  borderColor: '#f43f5e',
                  color: '#ff8da1',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Bấm để nghe thử giọng nữ sexy nhẹ nhàng của Em Vy"
              >
                🔊 Thử giọng em Vy
              </button>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    background: 'rgba(255, 51, 102, 0.2)',
                    borderColor: '#ff3366',
                    color: '#ff6688',
                  }}
                >
                  ⏹️ Dừng
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleTts}
                title={ttsEnabled ? 'Tắt tính năng AI đọc câu trả lời' : 'Bật tính năng AI đọc câu trả lời'}
                style={{
                  padding: '2px 8px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  background: ttsEnabled ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: ttsEnabled ? '#00ff88' : 'rgba(255, 255, 255, 0.2)',
                  color: ttsEnabled ? '#00ff88' : 'var(--mut)',
                }}
              >
                {ttsEnabled ? '🔊 Giọng nói: Bật' : '🔇 Giọng nói: Tắt'}
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
