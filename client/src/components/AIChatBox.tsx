import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatBoxProps = {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  height?: string | number;
  emptyStateMessage?: string;
  suggestedPrompts?: string[];
  quickReplies?: string[];
};

// ─── Typing Animation Hook ─────────────────────────────────────────────

function useTypingAnimation(fullText: string, isActive: boolean) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive || !fullText) {
      setDisplayedText(fullText);
      setIsTyping(false);
      return;
    }

    // Reset for new text
    indexRef.current = 0;
    setDisplayedText('');
    setIsTyping(true);

    const typeNextChunk = () => {
      if (indexRef.current >= fullText.length) {
        setIsTyping(false);
        return;
      }

      // Type 1-3 characters at a time for natural feel
      const chunkSize = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : 3;
      const nextIndex = Math.min(indexRef.current + chunkSize, fullText.length);
      indexRef.current = nextIndex;
      setDisplayedText(fullText.slice(0, nextIndex));

      // Variable delay: slower after punctuation, faster for regular chars
      const lastChar = fullText[nextIndex - 1];
      let delay: number;
      if (lastChar === '.' || lastChar === '!' || lastChar === '?') {
        delay = 80 + Math.random() * 120; // pause after sentences
      } else if (lastChar === ',' || lastChar === ';' || lastChar === ':') {
        delay = 50 + Math.random() * 80; // slight pause after commas
      } else if (lastChar === '\n') {
        delay = 60 + Math.random() * 100; // pause at line breaks
      } else {
        delay = 15 + Math.random() * 30; // fast for regular chars
      }

      timerRef.current = setTimeout(typeNextChunk, delay);
    };

    // Small initial delay before typing starts
    timerRef.current = setTimeout(typeNextChunk, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fullText, isActive]);

  return { displayedText, isTyping };
}

// ─── Typing Message Component ──────────────────────────────────────────

function TypingAssistantMessage({ content, isLatest }: { content: string; isLatest: boolean }) {
  const { displayedText, isTyping } = useTypingAnimation(content, isLatest);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Streamdown>{displayedText}</Streamdown>
      {isTyping && (
        <span className="inline-block w-[2px] h-4 bg-foreground/60 ml-0.5 animate-pulse align-text-bottom" />
      )}
    </div>
  );
}

// ─── Main AIChatBox Component ───────────────────────────────────────────

export function AIChatBox({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = "Type your message...",
  className,
  height = "600px",
  emptyStateMessage = "Start a conversation with AI",
  suggestedPrompts,
  quickReplies,
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track which message index is currently being typed
  const [lastTypedIndex, setLastTypedIndex] = useState(-1);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Track if user is manually scrolling up (to avoid auto-scroll overriding)
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  // Determine the latest assistant message index for typing animation
  const latestAssistantIndex = (() => {
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      if (displayMessages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  // When a new assistant message appears, mark it for typing
  useEffect(() => {
    if (latestAssistantIndex >= 0 && latestAssistantIndex > lastTypedIndex) {
      setLastTypedIndex(latestAssistantIndex);
    }
  }, [latestAssistantIndex, lastTypedIndex]);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = useCallback(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, []);

  // Scroll when messages change or during typing
  useEffect(() => {
    if (displayMessages.length > 0) {
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
  }, [displayMessages.length, scrollToBottom]);

  // Keep scrolling during typing animation — but only if user hasn't scrolled up
  useEffect(() => {
    if (latestAssistantIndex === lastTypedIndex && latestAssistantIndex >= 0 && !userScrolledUp) {
      const interval = setInterval(scrollToBottom, 200);
      return () => clearInterval(interval);
    }
  }, [latestAssistantIndex, lastTypedIndex, scrollToBottom, userScrolledUp]);

  // Reset userScrolledUp when a new message is sent
  useEffect(() => {
    setUserScrolledUp(false);
  }, [displayMessages.length]);

  // Detect manual scroll up
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    ) as HTMLDivElement;
    if (!viewport) return;

    const handleScroll = () => {
      const isAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 60;
      setUserScrolledUp(!isAtBottom);
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [displayMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    onSendMessage(trimmedInput);
    setInput("");

    // Scroll immediately after sending
    scrollToBottom();

    // Keep focus on input
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col bg-card text-card-foreground rounded-lg border shadow-sm",
        className
      )}
      style={{ height }}
    >
      {/* Messages Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-auto">
        {displayMessages.length === 0 ? (
          <div className="flex h-full flex-col p-4">
            <div className="flex flex-1 flex-col items-center justify-center gap-6 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <Sparkles className="size-12 opacity-20" />
                <p className="text-sm">{emptyStateMessage}</p>
              </div>

              {suggestedPrompts && suggestedPrompts.length > 0 && (
                <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => onSendMessage(prompt)}
                      disabled={isLoading}
                      className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="flex flex-col space-y-4 p-4">
              {displayMessages.map((message, index) => {
                const isLastMessage = index === displayMessages.length - 1;

                // Determine if this assistant message should animate typing
                const shouldAnimate =
                  message.role === 'assistant' &&
                  index === latestAssistantIndex &&
                  index === lastTypedIndex;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}

                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-4 py-2.5",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <TypingAssistantMessage
                          content={message.content}
                          isLatest={shouldAnimate}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 mt-1 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div
                  className="flex items-start gap-3"

                >
                  <div className="size-8 shrink-0 mt-1 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <div className="rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Quick Reply Chips */}
      {quickReplies && quickReplies.length > 0 && !isLoading && displayMessages.length > 0 && (
        <div className="flex gap-1.5 px-4 pt-2 pb-1 overflow-x-auto scrollbar-hide">
          {quickReplies.map((reply, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(reply)}
              className="shrink-0 text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        ref={inputAreaRef}
        onSubmit={handleSubmit}
        className="flex gap-2 p-4 border-t bg-background/50 items-end"
      >
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 max-h-32 resize-none min-h-9"
          rows={1}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="shrink-0 h-[38px] w-[38px]"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
