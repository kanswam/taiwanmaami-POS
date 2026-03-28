import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { X, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { marked } from 'marked';
import { useLocation } from 'wouter';

const GREETING_LADY_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/114675165/cCIiqSZESwdbtugN.png';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTED_PROMPTS = [
  "🧋 What's popular?",
  "🍵 Show me iced teas",
  "🍡 Tell me about mochis",
  "📍 Store info",
];

// Page-specific greeting messages
function getGreetingForPage(pathname: string): { bubble: string; cta: string } {
  if (pathname.startsWith('/menu')) {
    return {
      bubble: "Not sure what to order? 🤔 I can help you pick the perfect drink!",
      cta: "Help me choose →",
    };
  }
  if (pathname.startsWith('/locations')) {
    return {
      bubble: "Want to know our hours or how to get here? Just ask! 📍",
      cta: "Ask about locations →",
    };
  }
  if (pathname.startsWith('/events') || pathname.startsWith('/workshops')) {
    return {
      bubble: "Curious about our events or workshops? I've got all the details! 🎉",
      cta: "Tell me more →",
    };
  }
  if (pathname.startsWith('/wholesale')) {
    return {
      bubble: "Interested in wholesale orders? I can help with pricing and bulk options! 📦",
      cta: "Ask about wholesale →",
    };
  }
  return {
    bubble: "Hi there! 👋 Need help with our menu or ordering?",
    cta: "Chat with Maami Bot →",
  };
}

// Session storage keys
const FIRST_VISIT_KEY = 'maami_bot_first_visit_done';
const SESSION_GREETING_KEY = 'maami_bot_session_greeting_shown';

export function VoiceChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();

  // Get page-specific greeting
  const greeting = getGreetingForPage(location);

  // tRPC mutation
  const textChatMutation = trpc.chatbot.chat.useMutation();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const viewport = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      });
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, scrollToBottom]);

  // Auto-open chat for first-time visitors after 5 seconds
  useEffect(() => {
    const hasVisitedBefore = localStorage.getItem(FIRST_VISIT_KEY);
    if (!hasVisitedBefore && !hasInteracted && !isOpen) {
      autoOpenTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        setAutoOpened(true);
        setMessages([{
          role: 'assistant',
          content: "Welcome to Taiwan Maami! 🧋✨ I'm **Maami Bot**, your personal ordering assistant.\n\nI can help you with:\n- 🍵 **Menu recommendations** — tell me what you like!\n- 📍 **Store hours & locations**\n- 🎉 **Events & workshops**\n- 🛵 **Delivery & pickup info**\n\nWhat can I help you with today?",
        }]);
        localStorage.setItem(FIRST_VISIT_KEY, 'true');
      }, 5000);
    }
    return () => {
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
    };
  }, [hasInteracted, isOpen]);

  // Show greeting bubble for returning visitors (per session, per page change)
  useEffect(() => {
    const sessionGreetingShown = sessionStorage.getItem(SESSION_GREETING_KEY + location);
    if (!hasInteracted && !isOpen && !autoOpened && !sessionGreetingShown) {
      // Show greeting after 3 seconds
      greetingTimerRef.current = setTimeout(() => {
        setShowGreeting(true);
        sessionStorage.setItem(SESSION_GREETING_KEY + location, 'true');
      }, 3000);

      // Show pulse notification after 8 seconds
      pulseTimerRef.current = setTimeout(() => {
        setHasNewMessage(true);
      }, 8000);
    }
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [hasInteracted, isOpen, autoOpened, location]);

  // Auto-dismiss greeting after 10 seconds (but don't dismiss on scroll — keep it visible)
  useEffect(() => {
    if (showGreeting) {
      greetingDismissTimerRef.current = setTimeout(() => {
        setShowGreeting(false);
      }, 10000);
    }
    return () => {
      if (greetingDismissTimerRef.current) clearTimeout(greetingDismissTimerRef.current);
    };
  }, [showGreeting]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Handle text message
  const handleTextSend = useCallback(async () => {
    const text = textInput.trim();
    if (!text || isProcessing) return;
    if (!hasInteracted) setHasInteracted(true);

    setTextInput('');
    const userMsg: ChatMessage = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      const conversationHistory = newMessages.map(m => ({ role: m.role, content: m.content }));
      const response = await textChatMutation.mutateAsync({ messages: conversationHistory });

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.reply,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try again!',
      }]);
    } finally {
      setIsProcessing(false);
    }
  }, [textInput, messages, isProcessing, hasInteracted, textChatMutation]);

  // Handle suggested prompt click
  const handlePromptClick = useCallback((prompt: string) => {
    if (!hasInteracted) setHasInteracted(true);
    const userMsg: ChatMessage = { role: 'user', content: prompt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsProcessing(true);

    const conversationHistory = newMessages.map(m => ({ role: m.role, content: m.content }));
    textChatMutation.mutate(
      { messages: conversationHistory },
      {
        onSuccess: (response) => {
          setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
          setIsProcessing(false);
        },
        onError: () => {
          setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, please try again!' }]);
          setIsProcessing(false);
        },
      }
    );
  }, [messages, hasInteracted, textChatMutation]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    setHasNewMessage(false);
    if (!isOpen) {
      setShowGreeting(false);
    }
  }, [isOpen]);

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
        <div className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-card flex flex-col" style={{ height: 'min(520px, calc(100vh - 160px))' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#c0392b] to-[#e74c3c] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Maami Bot</h3>
                <p className="text-white/70 text-xs">
                  {isProcessing ? '🤔 Thinking...' : 'Your ordering assistant'}
                </p>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c0392b]/10 to-[#e74c3c]/10 flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-[#c0392b]/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Hi! I'm Maami Bot 🧋</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask me anything about our menu, delivery, or promotions!
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptClick(prompt)}
                      disabled={isProcessing}
                      className="text-xs px-3 py-1.5 rounded-full border border-[#c0392b]/30 text-[#c0392b] bg-[#c0392b]/5 hover:bg-[#c0392b]/10 transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 p-3">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex gap-2',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-[#c0392b]/10 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-[#c0392b]" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[80%] rounded-2xl px-3.5 py-2.5',
                        msg.role === 'user'
                          ? 'bg-[#c0392b] text-white'
                          : 'bg-muted text-foreground'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                            <div dangerouslySetInnerHTML={{ __html: marked.parse(msg.content, { async: false }) as string }} />
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 shrink-0 mt-1 rounded-full bg-[#c0392b]/10 flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-[#c0392b]" />
                      </div>
                      <div className="rounded-2xl bg-muted px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Text Input Area */}
          <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); handleTextSend(); }}
              className="flex gap-2"
            >
              <Textarea
                ref={inputRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSend();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 max-h-20 resize-none min-h-9 text-sm"
                rows={1}
                disabled={isProcessing}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!textInput.trim() || isProcessing}
                className="shrink-0 h-9 w-9 bg-[#c0392b] hover:bg-[#a93226] text-white rounded-xl"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Greeting Speech Bubble - Page-contextual, persistent for 10s */}
      {showGreeting && !isOpen && (
        <div
          className={cn(
            'fixed bottom-[130px] right-4 sm:bottom-[150px] sm:right-6 z-50',
            'animate-in fade-in slide-in-from-bottom-2 duration-500',
            'cursor-pointer'
          )}
          onClick={toggleChat}
        >
          <div className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[260px] relative border border-gray-100">
            <p className="text-sm text-gray-800 font-medium leading-snug">
              {greeting.bubble}
            </p>
            <p className="text-xs text-[#c0392b] font-semibold mt-1.5">
              {greeting.cta}
            </p>
            {/* Speech bubble tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Floating Chat Button - Larger with visible label on ALL screens */}
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
          <div className="relative group flex items-end gap-1.5">
            {/* "Ask Maami" label pill - NOW visible on ALL screens including mobile */}
            <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 mb-3 chat-label-pulse">
              <Sparkles className="w-3.5 h-3.5 text-[#c0392b]" />
              <span className="text-xs font-semibold text-gray-800 whitespace-nowrap">Ask Maami</span>
            </div>

            {/* Animated greeting lady image - larger on both mobile and desktop */}
            <div className="chat-lady-bounce relative">
              <img
                src={GREETING_LADY_URL}
                alt="Chat with Maami Bot"
                className="w-[68px] h-[85px] sm:w-[76px] sm:h-[95px] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                loading="eager"
              />
              
              {/* Pulsing ring behind the image */}
              <div className="absolute inset-0 -z-10 rounded-full bg-[#c0392b]/15 blur-xl scale-150 chat-glow" />
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
