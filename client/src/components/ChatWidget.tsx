import { useState, useCallback, useRef, useEffect } from 'react';
import { AIChatBox, type Message } from './AIChatBox';
import { X, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const GREETING_LADY_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/114675165/cCIiqSZESwdbtugN.png';

const SUGGESTED_PROMPTS = [
  "What's popular?",
  "Show me iced teas",
  "Tell me about mochis",
  "Any workshops?",
];

const DEFAULT_QUICK_REPLIES = [
  "🧋 Bubble Tea",
  "🍡 Mochis",
  "🍗 Food",
  "📍 Store Info",
];

// Generate a stable session ID per browser session
function getChatSessionId(): string {
  const key = 'maami_chat_session';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(DEFAULT_QUICK_REPLIES);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [greetingDismissed, setGreetingDismissed] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef(getChatSessionId());

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: data.reply,
      }]);
      // Update quick replies from backend response
      if (data.quickReplies && data.quickReplies.length > 0) {
        setQuickReplies(data.quickReplies);
      }
      if (!isOpen) {
        setHasNewMessage(true);
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Sorry, I\'m having trouble right now. Please try again in a moment, or browse our menu directly!',
      }]);
    },
  });

  const handleSendMessage = useCallback((content: string) => {
    if (!hasInteracted) setHasInteracted(true);
    
    const userMessage: Message = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    const conversationHistory = newMessages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ messages: conversationHistory, sessionId: sessionIdRef.current });
  }, [messages, chatMutation, hasInteracted]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    setHasNewMessage(false);
    if (!isOpen) {
      setShowGreeting(false);
      setGreetingDismissed(true);
    }
  }, [isOpen]);

  // Show greeting tooltip after 3 seconds (faster), pulse after 8
  useEffect(() => {
    if (!hasInteracted && !isOpen && !greetingDismissed) {
      greetingTimerRef.current = setTimeout(() => {
        setShowGreeting(true);
      }, 3000);
      pulseTimerRef.current = setTimeout(() => {
        setHasNewMessage(true);
      }, 8000);
    }
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [hasInteracted, isOpen, greetingDismissed]);

  // Dismiss greeting tooltip on scroll (but don't prevent it from showing again)
  useEffect(() => {
    const handleScroll = () => {
      if (showGreeting) setShowGreeting(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showGreeting]);

  return (
    <>
      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-20 right-4 z-50 transition-all duration-300 ease-in-out',
          'sm:bottom-24 sm:right-6',
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-[#c0392b] to-[#e74c3c] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Maami Bot</h3>
                <p className="text-white/70 text-xs">Your ordering assistant</p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <AIChatBox
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={chatMutation.isPending}
            placeholder="Ask about our menu..."
            height="min(450px, calc(100vh - 200px))"
            emptyStateMessage="Hi! I'm Maami Bot 🧋 How can I help you today?"
            suggestedPrompts={SUGGESTED_PROMPTS}
            quickReplies={quickReplies}
            className="border-0 rounded-none shadow-none"
          />
        </div>
      </div>

      {/* Greeting Speech Bubble - More prominent with CTA */}
      {showGreeting && !isOpen && (
        <div
          className={cn(
            'fixed bottom-[130px] right-4 sm:bottom-[150px] sm:right-6 z-50',
            'animate-in fade-in slide-in-from-bottom-2 duration-500',
            'cursor-pointer'
          )}
          onClick={toggleChat}
        >
          <div className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[240px] relative border border-gray-100">
            <p className="text-sm text-gray-800 font-medium leading-snug">
              Hi there! 👋 Need help with our menu or ordering?
            </p>
            <p className="text-xs text-[#c0392b] font-semibold mt-1.5">
              Tap to chat with Maami Bot →
            </p>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Floating Chat Button - Larger with label */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
          'transition-all duration-300 ease-in-out',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0392b] focus-visible:ring-offset-2',
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        {isOpen ? (
          <div className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center shadow-lg">
            <X className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="relative group flex items-end gap-2">
            {/* "Ask Maami" label pill - visible on larger screens */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 mb-2 chat-label-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#c0392b]" />
              <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">Ask Maami</span>
            </div>

            {/* Animated greeting lady image - slightly larger */}
            <div className="chat-lady-bounce relative">
              <img
                src={GREETING_LADY_URL}
                alt="Chat with Maami Bot"
                className="w-[64px] h-[80px] sm:w-[72px] sm:h-[90px] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                loading="eager"
              />
              
              {/* Glowing ring behind the image */}
              <div className="absolute inset-0 -z-10 rounded-full bg-[#c0392b]/10 blur-xl scale-150 chat-glow" />
            </div>

            {/* Notification dot - larger and more visible */}
            {hasNewMessage && (
              <span className="absolute -top-1 right-0 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse flex items-center justify-center shadow-md">
                <span className="text-white text-[11px] font-bold">1</span>
              </span>
            )}
          </div>
        )}
      </button>

      {/* Inline styles for animations */}
      <style>{`
        @keyframes chatLadyBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .chat-lady-bounce {
          animation: chatLadyBounce 2.5s ease-in-out infinite;
        }
        .chat-lady-bounce:hover {
          animation-play-state: paused;
        }
        @keyframes chatGlow {
          0%, 100% { opacity: 0.3; transform: scale(1.5); }
          50% { opacity: 0.6; transform: scale(1.8); }
        }
        .chat-glow {
          animation: chatGlow 3s ease-in-out infinite;
        }
        @keyframes labelPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(192, 57, 43, 0.3); }
          50% { box-shadow: 0 0 0 6px rgba(192, 57, 43, 0); }
        }
        .chat-label-pulse {
          animation: labelPulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
