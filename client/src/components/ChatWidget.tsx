import { useState, useCallback, useRef, useEffect } from 'react';
import { AIChatBox, type Message } from './AIChatBox';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

const SUGGESTED_PROMPTS = [
  "What's popular?",
  "Show me iced teas",
  "Tell me about mochis",
  "Delivery info",
];

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Send only user/assistant messages (not system) to the server
    const conversationHistory = newMessages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    chatMutation.mutate({ messages: conversationHistory });
  }, [messages, chatMutation, hasInteracted]);

  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    setHasNewMessage(false);
  }, []);

  // Show a subtle pulse after 10 seconds if user hasn't interacted
  useEffect(() => {
    if (!hasInteracted && !isOpen) {
      pulseTimerRef.current = setTimeout(() => {
        setHasNewMessage(true);
      }, 10000);
    }
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [hasInteracted, isOpen]);

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
            className="border-0 rounded-none shadow-none"
          />
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
          'w-14 h-14 rounded-full shadow-lg',
          'flex items-center justify-center',
          'transition-all duration-300 ease-in-out',
          'hover:scale-110 active:scale-95',
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700 rotate-0'
            : 'bg-gradient-to-br from-[#c0392b] to-[#e74c3c] hover:from-[#a93226] hover:to-[#c0392b]'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open chat assistant'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}

        {/* Notification dot */}
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>
    </>
  );
}
