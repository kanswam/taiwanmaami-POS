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

const QUICK_REPLIES = [
  "🧋 Bubble Tea",
  "🍡 Mochis",
  "🍗 Food",
  "📍 Store Hours",
  "🎓 Workshops",
  "🚚 Delivery Info",
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chatMutation = trpc.chatbot.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: data.reply,
      }]);
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

    chatMutation.mutate({ messages: conversationHistory });
  }, [messages, chatMutation, hasInteracted]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    setHasNewMessage(false);
    if (!isOpen) {
      setShowGreeting(false);
    }
  }, [isOpen]);

  // Show greeting tooltip after 5 seconds, pulse after 10
  useEffect(() => {
    if (!hasInteracted && !isOpen) {
      greetingTimerRef.current = setTimeout(() => {
        setShowGreeting(true);
      }, 5000);
      pulseTimerRef.current = setTimeout(() => {
        setHasNewMessage(true);
      }, 10000);
    }
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [hasInteracted, isOpen]);

  // Dismiss greeting tooltip on scroll
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
            quickReplies={QUICK_REPLIES}
            className="border-0 rounded-none shadow-none"
          />
        </div>
      </div>

      {/* Greeting Speech Bubble */}
      {showGreeting && !isOpen && (
        <div
          className={cn(
            'fixed bottom-[120px] right-4 sm:bottom-[140px] sm:right-6 z-50',
            'animate-in fade-in slide-in-from-bottom-2 duration-500'
          )}
        >
          <div className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[200px] relative border border-gray-100">
            <p className="text-sm text-gray-800 font-medium leading-snug">
              Nǐ hǎo! வணக்கம்! 👋 Need help with our menu?
            </p>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Floating Chat Button with Greeting Lady */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
          'transition-all duration-300 ease-in-out',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0392b] focus-visible:ring-offset-2',
          isOpen ? 'w-14 h-14' : 'w-[56px] h-[70px] sm:w-[64px] sm:h-[80px]'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        {isOpen ? (
          <div className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center shadow-lg">
            <X className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="relative group">
            {/* Animated greeting lady image */}
            <div className="chat-lady-bounce">
              <img
                src={GREETING_LADY_URL}
                alt="Chat with us"
                className="w-[56px] h-[70px] sm:w-[64px] sm:h-[80px] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                loading="eager"
              />
            </div>

            {/* Notification dot */}
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">1</span>
              </span>
            )}
          </div>
        )}
      </button>

      {/* Inline styles for the gentle bounce animation */}
      <style>{`
        @keyframes chatLadyBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .chat-lady-bounce {
          animation: chatLadyBounce 3s ease-in-out infinite;
        }
        .chat-lady-bounce:hover {
          animation-play-state: paused;
        }
      `}</style>
    </>
  );
}
