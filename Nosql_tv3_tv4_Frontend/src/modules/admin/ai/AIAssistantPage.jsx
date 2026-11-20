import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  MapPin,
  Bus,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Navigation,
  MessageSquare,
  X,
  RotateCcw,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { aiService } from '../../../services/aiService';
import Button from '../../../components/Button';
import Badge from '../../../components/Badge';

const SAMPLE_QUESTIONS = [
  'Tôi muốn đi từ Bến Thành đến Chợ Lớn, ưu tiên ít chuyển tuyến.',
  'Cho tôi biết những tuyến xe buýt đi qua trạm Bến Thành?',
  'Tuyến nào chạy từ Bến Thành đến Đại học Bách Khoa?',
  'Giá vé xe buýt phổ thông tại TP.HCM hiện nay là bao nhiêu?',
];

export default function AIAssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Xin chào! Tôi là Trợ lý AI Tra cứu Lộ trình Xe buýt TP.HCM (BusRoute HCM).\nTôi sử dụng mô hình trí tuệ nhân tạo cục bộ (Ollama qwen3.5:4b) kết hợp dữ liệu trực tiếp từ cơ sở dữ liệu MongoDB.\n\nBạn muốn tìm đường đi từ đâu đến đâu, hoặc cần tra cứu thông tin trạm nào?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(1);
  const [aiStatus, setAiStatus] = useState({ online: true, modelFound: true });
  
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const stepTimerRef = useRef(null);

  useEffect(() => {
    checkStatus();
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const checkStatus = async () => {
    try {
      const res = await aiService.getStatus();
      setAiStatus(res);
    } catch {
      setAiStatus({ online: false, modelFound: false });
    }
  };

  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
    }
    setLoading(false);
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text || !text.trim() || loading) return;

    // Hủy request cũ nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setThinkingStep(1);

    // Dynamic thinking steps animation
    if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    stepTimerRef.current = setInterval(() => {
      setThinkingStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    try {
      const res = await aiService.sendMessage(text.trim(), controller.signal);
      
      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: res.reply || 'Xin lỗi, không nhận được phản hồi từ AI.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: res.data,
        extracted: res.extracted,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        const cancelMsg = {
          id: Date.now() + 1,
          sender: 'assistant',
          isCanceled: true,
          text: 'Đã hủy yêu cầu tra cứu theo lệnh của bạn.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, cancelMsg]);
        return;
      }

      const isTimeout = err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout');
      let errorDesc = `Đã xảy ra lỗi khi kết nối với Trợ lý AI: ${err.message}.`;
      
      if (isTimeout) {
        errorDesc = 'Yêu cầu vượt quá thời gian phản hồi (180 giây). Mô hình AI cục bộ đang bận hoặc nạp dữ liệu nặng. Bạn có thể bấm Thử lại hoặc dùng tính năng Tra cứu lộ trình trực tiếp.';
      } else if (!aiStatus.online) {
        errorDesc = 'Dịch vụ Ollama hiện đang ngoại tuyến (Offline). Bạn vẫn có thể sử dụng các tính năng tìm đường và bản đồ trực tiếp từ MongoDB trên thanh menu.';
      }

      const errMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        isError: true,
        isTimeout,
        retryText: text.trim(),
        text: errorDesc,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const getStepText = (step) => {
    switch (step) {
      case 1:
        return 'Bước 1/3: Đang phân tích ý định và trích xuất điểm đi/điểm đến...';
      case 2:
        return 'Bước 2/3: Đang truy vấn đồ thị lộ trình xe buýt từ MongoDB...';
      case 3:
      default:
        return 'Bước 3/3: Đang gọi mô hình Ollama qwen3.5:4b tổng hợp câu trả lời...';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Trợ lý AI</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hỏi đáp bằng ngôn ngữ tự nhiên, phân tích ý định và tra cứu lộ trình xe buýt dựa trên dữ liệu thật từ MongoDB
          </p>
        </div>

        {/* AI Status Badge */}
        <div className="flex items-center gap-2">
          {aiStatus.online ? (
            <Badge variant="success" className="px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
              Ollama Local Online ({aiStatus.activeModel || 'qwen3.5:4b'})
            </Badge>
          ) : (
            <Badge variant="warning" className="px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-amber-500 mr-1.5" />
              Ollama Offline (Chế độ dự phòng MongoDB)
            </Badge>
          )}
          <Button variant="secondary" size="sm" onClick={checkStatus}>
            <RefreshCw size={13} /> Kiểm tra
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col h-[620px] rounded-xl border border-[#E2E8F0] bg-white shadow-xs overflow-hidden">
        {/* Messages scroll box */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#F8FAFC]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${
                  msg.sender === 'user' ? 'bg-[#172B4D]' : msg.isError ? 'bg-rose-600' : 'bg-[#245A85]'
                }`}
              >
                {msg.sender === 'user' ? <MessageSquare size={16} /> : <Bot size={16} />}
              </div>

              <div
                className={`rounded-xl p-4 text-xs leading-relaxed space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-[#172B4D] text-white shadow-xs'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-[#D9534F]'
                    : msg.isCanceled
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-white border border-[#E2E8F0] text-slate-800 shadow-xs'
                }`}
              >
                <div className="whitespace-pre-line">{msg.text}</div>

                {/* Nút Thử lại khi gặp lỗi hoặc timeout */}
                {msg.isError && msg.retryText && (
                  <div className="mt-2 pt-2 border-t border-rose-200 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Bạn có muốn gửi lại câu hỏi không?</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleSendMessage(msg.retryText)}
                      className="text-[11px] flex items-center gap-1 border-rose-200 hover:bg-rose-100"
                    >
                      <RotateCcw size={12} /> Thử lại
                    </Button>
                  </div>
                )}

                {/* Structured Route Card from MongoDB if available */}
                {msg.data && msg.data.paths && msg.data.paths.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <div className="font-bold text-[#172B4D] flex items-center justify-between">
                      <span>Các phương án tìm được từ MongoDB:</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/admin/route-planner')}
                        className="text-[11px]"
                      >
                        <Navigation size={12} /> Xem trên Bản đồ
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {msg.data.paths.map((p, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px]">
                          <div className="flex items-center justify-between font-semibold text-[#172B4D]">
                            <span>Phương án {idx + 1}: Tuyến {p.routes.join(' → Tuyến ')}</span>
                            <Badge variant={p.transfers === 0 ? 'success' : 'info'}>
                              {p.transfers === 0 ? 'Đi thẳng' : `${p.transfers} lần chuyển`}
                            </Badge>
                          </div>
                          <div className="text-slate-500 mt-1">
                            Tổng {p.totalStops} trạm dừng &bull; {p.stops.map((s) => s.name).slice(0, 3).join(' → ')} ...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[10px] text-right ${
                    msg.sender === 'user' ? 'text-slate-300' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Thinking / Loading indicator with steps and cancel button */}
          {loading && (
            <div className="flex gap-3 max-w-lg">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#245A85] text-white">
                <Bot size={16} />
              </div>
              <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-xs text-slate-700 shadow-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-[#245A85] animate-ping" />
                  <span className="font-semibold text-[#172B4D]">{getStepText(thinkingStep)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Mô hình: qwen3.5:4b &bull; Timeout tối đa: 180s</span>
                  <button
                    type="button"
                    onClick={handleCancelRequest}
                    className="text-rose-600 hover:text-rose-700 font-semibold underline flex items-center gap-0.5 cursor-pointer ml-3"
                  >
                    <X size={12} /> Hủy yêu cầu
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Preset quick question pills */}
        <div className="border-t border-[#E2E8F0] bg-white px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Gợi ý nhanh:</span>
          {SAMPLE_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              disabled={loading}
              onClick={() => handleSendMessage(q)}
              className="rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 px-3 py-1 text-[11px] text-slate-600 shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="border-t border-[#E2E8F0] bg-white p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={loading ? "Đang chờ Trợ lý AI xử lý câu hỏi..." : "Nhập câu hỏi của bạn (ví dụ: Tôi muốn đi từ Bến Thành đến Chợ Lớn)..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-slate-50 px-4 py-2.5 text-xs text-[#172B4D] focus:border-[#245A85] focus:bg-white focus:outline-none disabled:bg-slate-100"
            />
            {loading ? (
              <Button type="button" variant="danger" onClick={handleCancelRequest} className="shrink-0 flex items-center gap-1">
                <X size={15} /> Hủy bỏ
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={!inputText.trim()} className="shrink-0 flex items-center gap-1">
                <Send size={15} /> Gửi câu hỏi
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
