import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, Send, User, Sparkles, ExternalLink, Calendar, BookOpen, ArrowRight, Drumstick } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

/**
 * Message type matching server-side LLM Message interface
 */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
  cards?: any[];
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
};

// ─── Product Card Component ─────────────────────────────────────────────

function ProductCardInline({ card }: { card: any }) {
  const [, navigate] = useLocation();
  const price = card.pricePetite || card.priceRegular || card.priceLarge || 0;
  const priceDisplay = price > 0 ? `₹${(price / 100).toFixed(0)}` : '';
  const maxPrice = card.priceLarge || card.priceRegular || 0;
  const priceRange = maxPrice > price && maxPrice > 0
    ? `${priceDisplay} - ₹${(maxPrice / 100).toFixed(0)}`
    : priceDisplay;

  // Build Cloudinary thumbnail URL (200px width for chat cards)
  const thumbUrl = card.imageUrl
    ? card.imageUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/')
    : null;

  return (
    <button
      onClick={() => navigate(`/menu?category=${encodeURIComponent(card.category)}&subcategory=${encodeURIComponent(card.subcategory)}`)}
      className="flex items-center gap-3 p-2 rounded-lg bg-background/80 hover:bg-accent/50 transition-colors text-left w-full border border-border/30 cursor-pointer group"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={card.name}
          className="w-14 h-14 rounded-lg object-cover shrink-0 group-hover:scale-105 transition-transform"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <span className="text-2xl">🧋</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-xs leading-tight truncate">{card.name}</span>
          {card.isNonVeg && (
            <span className="shrink-0 w-3.5 h-3.5 rounded-sm bg-red-600 flex items-center justify-center">
              <Drumstick className="w-2 h-2 text-white" />
            </span>
          )}
        </div>
        {card.chineseName && (
          <span className="text-[10px] text-muted-foreground block truncate">{card.chineseName}</span>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs font-semibold text-[#c0392b]">{priceRange}</span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            View <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Workshop Card Component ────────────────────────────────────────────

function WorkshopCardInline({ card }: { card: any }) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(card.link)}
      className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 hover:bg-amber-100/80 transition-colors text-left w-full border border-amber-200/50 cursor-pointer group"
    >
      {card.imageUrl ? (
        <img
          src={card.imageUrl.includes('/upload/') ? card.imageUrl.replace('/upload/', '/upload/w_120,h_120,c_fill,q_auto,f_auto/') : card.imageUrl}
          alt={card.title}
          className="w-14 h-14 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Calendar className="w-6 h-6 text-amber-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-xs leading-tight line-clamp-1 text-amber-900">{card.title}</span>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-amber-700">{card.date}</span>
          <span className="text-[10px] text-amber-600">|</span>
          <span className="text-[10px] text-amber-700">{card.time}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs font-semibold text-amber-800">
            {card.earlyBirdPrice ? `₹${card.earlyBirdPrice}` : `₹${card.price}`}
            {card.isSoldOut && <span className="text-red-600 ml-1 font-bold">SOLD OUT</span>}
          </span>
          <span className="text-[10px] text-amber-600 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            Book <ArrowRight className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Blog Card Component ────────────────────────────────────────────────

function BlogCardInline({ card }: { card: any }) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(card.link)}
      className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 hover:bg-blue-100/80 transition-colors text-left w-full border border-blue-200/50 cursor-pointer group"
    >
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.title}
          className="w-14 h-14 rounded-lg object-cover shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-blue-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-xs leading-tight line-clamp-2 text-blue-900">{card.title}</span>
        <span className="text-[10px] text-blue-600 flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          Read article <ArrowRight className="w-2.5 h-2.5" />
        </span>
      </div>
    </button>
  );
}

// ─── Category Link Component ────────────────────────────────────────────

function CategoryLinkInline({ card }: { card: any }) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(card.link)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c0392b]/10 hover:bg-[#c0392b]/20 text-[#c0392b] text-xs font-medium transition-colors cursor-pointer border border-[#c0392b]/20"
    >
      {card.name}
      <ExternalLink className="w-3 h-3" />
    </button>
  );
}

// ─── Rich Cards Container ───────────────────────────────────────────────

function RichCards({ cards }: { cards: any[] }) {
  if (!cards || cards.length === 0) return null;

  const productCards = cards.filter(c => c.type === 'product');
  const workshopCards = cards.filter(c => c.type === 'workshop');
  const blogCards = cards.filter(c => c.type === 'blog');
  const categoryLinks = cards.filter(c => c.type === 'category_link');

  return (
    <div className="mt-2 space-y-2">
      {/* Category links as pills */}
      {categoryLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {categoryLinks.map((card, i) => (
            <CategoryLinkInline key={`cat-${i}`} card={card} />
          ))}
        </div>
      )}

      {/* Product cards in a scrollable horizontal list or grid */}
      {productCards.length > 0 && (
        <div className="space-y-1.5">
          {productCards.slice(0, 6).map((card, i) => (
            <ProductCardInline key={`prod-${i}`} card={card} />
          ))}
          {productCards.length > 6 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{productCards.length - 6} more items — browse the menu for all options
            </p>
          )}
        </div>
      )}

      {/* Workshop cards */}
      {workshopCards.length > 0 && (
        <div className="space-y-1.5">
          {workshopCards.map((card, i) => (
            <WorkshopCardInline key={`ws-${i}`} card={card} />
          ))}
        </div>
      )}

      {/* Blog cards */}
      {blogCards.length > 0 && (
        <div className="space-y-1.5">
          {blogCards.map((card, i) => (
            <BlogCardInline key={`blog-${i}`} card={card} />
          ))}
        </div>
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
}: AIChatBoxProps) {
  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Filter out system messages
  const displayMessages = messages.filter((msg) => msg.role !== "system");

  // Calculate min-height for last assistant message to push user message to top
  const [minHeightForLastMessage, setMinHeightForLastMessage] = useState(0);

  useEffect(() => {
    if (containerRef.current && inputAreaRef.current) {
      const containerHeight = containerRef.current.offsetHeight;
      const inputHeight = inputAreaRef.current.offsetHeight;
      const scrollAreaHeight = containerHeight - inputHeight;

      const userMessageReservedHeight = 56;
      const calculatedHeight = scrollAreaHeight - 32 - userMessageReservedHeight;

      setMinHeightForLastMessage(Math.max(0, calculatedHeight));
    }
  }, []);

  // Scroll to bottom helper function with smooth animation
  const scrollToBottom = () => {
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
  };

  // Scroll when messages change (new cards loaded)
  useEffect(() => {
    if (displayMessages.length > 0) {
      // Delay to allow cards to render
      const timer = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timer);
    }
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
      <div ref={scrollAreaRef} className="flex-1 overflow-hidden">
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
                // Apply min-height to last message only if NOT loading
                const isLastMessage = index === displayMessages.length - 1;
                const shouldApplyMinHeight =
                  isLastMessage && !isLoading && minHeightForLastMessage > 0;

                return (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user"
                        ? "justify-end items-start"
                        : "justify-start items-start"
                    )}
                    style={
                      shouldApplyMinHeight
                        ? { minHeight: `${minHeightForLastMessage}px` }
                        : undefined
                    }
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
                        <>
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
                          {/* Rich cards below the message text */}
                          {message.cards && message.cards.length > 0 && (
                            <RichCards cards={message.cards} />
                          )}
                        </>
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
                  style={
                    minHeightForLastMessage > 0
                      ? { minHeight: `${minHeightForLastMessage}px` }
                      : undefined
                  }
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
