import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { X, Mic, MicOff, Send, Volume2, VolumeX, Loader2, Sparkles, MessageSquare, Keyboard } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Streamdown } from 'streamdown';

const GREETING_LADY_URL = 'https://files.manuscdn.com/user_upload_by_module/session_file/114675165/cCIiqSZESwdbtugN.png';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string | null;
  detectedLanguage?: string;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
  ru: 'Russian',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
};

const SUGGESTED_PROMPTS = [
  "🧋 What's popular?",
  "🍵 Show me iced teas",
  "🍡 Tell me about mochis",
  "📍 Store info",
];

export function VoiceChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greetingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // tRPC mutations
  const uploadAudioMutation = trpc.chatbot.uploadAudio.useMutation();
  const voiceChatMutation = trpc.chatbot.voiceChat.useMutation();
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

  // Auto-play audio response
  const playAudio = useCallback((url: string) => {
    if (isMuted) return;
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.play().catch(err => console.warn('Audio autoplay blocked:', err));
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }, [isMuted]);

  // Show greeting tooltip after 5 seconds
  useEffect(() => {
    if (!hasInteracted && !isOpen) {
      greetingTimerRef.current = setTimeout(() => setShowGreeting(true), 5000);
      pulseTimerRef.current = setTimeout(() => setHasNewMessage(true), 10000);
    }
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
      if (greetingTimerRef.current) clearTimeout(greetingTimerRef.current);
    };
  }, [hasInteracted, isOpen]);

  // Dismiss greeting on scroll
  useEffect(() => {
    const handleScroll = () => { if (showGreeting) setShowGreeting(false); };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showGreeting]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setMicPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use webm, fallback to whatever is supported
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);

        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size < 100) {
          console.warn('Recording too short');
          return;
        }

        await processVoiceMessage(blob, recorder.mimeType || 'audio/webm');
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Mic access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setMicPermissionDenied(true);
      }
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Process voice message
  const processVoiceMessage = async (blob: Blob, mimeType: string) => {
    if (!hasInteracted) setHasInteracted(true);
    setIsProcessing(true);

    try {
      // Convert blob to base64
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Upload audio
      const { audioUrl } = await uploadAudioMutation.mutateAsync({
        audioBase64: base64,
        mimeType: mimeType.split(';')[0], // Remove codec info
      });

      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Send to voice chat endpoint
      const response = await voiceChatMutation.mutateAsync({
        audioUrl,
        conversationHistory,
      });

      // Add user message (transcribed)
      const userMsg: ChatMessage = {
        role: 'user',
        content: response.userText,
        detectedLanguage: response.detectedLanguage,
      };

      // Add assistant response
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.reply,
        audioUrl: response.audioUrl,
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);

      // Auto-play the response
      if (response.audioUrl) {
        playAudio(response.audioUrl);
      }

    } catch (err: any) {
      console.error('Voice chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble understanding that. Could you try again?',
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text message (fallback)
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
    if (!isOpen) setShowGreeting(false);
  }, [isOpen]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
                  {isRecording ? '🎙️ Listening...' : isProcessing ? '🤔 Thinking...' : 'Voice & text assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={toggleChat}
                className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c0392b]/10 to-[#e74c3c]/10 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-[#c0392b]/60" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Hi! I'm Maami Bot 🧋</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tap the mic and speak in any language!
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    English · தமிழ் · हिन्दी · 中文 and more
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
                        {msg.role === 'user' && msg.detectedLanguage && (
                          <span className="text-[10px] text-white/60 block mb-0.5">
                            🎙️ {LANGUAGE_NAMES[msg.detectedLanguage] || msg.detectedLanguage}
                          </span>
                        )}
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                            <Streamdown>{msg.content}</Streamdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.role === 'assistant' && msg.audioUrl && (
                          <button
                            onClick={() => playAudio(msg.audioUrl!)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] text-[#c0392b] hover:text-[#c0392b]/80 transition-colors"
                          >
                            <Volume2 className="w-3 h-3" />
                            Play again
                          </button>
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
                          <span className="text-xs text-muted-foreground">
                            {uploadAudioMutation.isPending ? 'Uploading...' :
                             voiceChatMutation.isPending ? 'Listening & thinking...' :
                             'Processing...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Input Area */}
          <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
            {/* Recording State */}
            {isRecording && (
              <div className="flex items-center justify-center gap-3 py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-600">{formatDuration(recordingDuration)}</span>
                </div>
                {/* Waveform animation */}
                <div className="flex items-center gap-0.5 h-6">
                  {[...Array(12)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[#c0392b] rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 16 + 8}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.4 + Math.random() * 0.4}s`,
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={stopRecording}
                  className="px-4 py-1.5 bg-red-500 text-white text-sm font-medium rounded-full hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Mic Permission Denied */}
            {micPermissionDenied && !isRecording && (
              <div className="px-4 py-2 text-center">
                <p className="text-xs text-red-500">
                  <MicOff className="w-3 h-3 inline mr-1" />
                  Microphone access denied. Please allow mic access in your browser settings, or use text input.
                </p>
              </div>
            )}

            {/* Text Input (toggle) */}
            {showTextInput && !isRecording && (
              <form
                onSubmit={(e) => { e.preventDefault(); handleTextSend(); }}
                className="flex gap-2 px-3 pt-2"
              >
                <Textarea
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
                  className="shrink-0 h-9 w-9 bg-[#c0392b] hover:bg-[#a93226]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            )}

            {/* Main Controls */}
            {!isRecording && (
              <div className="flex items-center justify-center gap-3 py-3 px-4">
                {/* Text input toggle */}
                <button
                  onClick={() => setShowTextInput(!showTextInput)}
                  className={cn(
                    'p-2.5 rounded-full transition-all',
                    showTextInput
                      ? 'bg-[#c0392b]/10 text-[#c0392b]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  aria-label="Toggle text input"
                >
                  <Keyboard className="w-5 h-5" />
                </button>

                {/* Main mic button */}
                <button
                  onClick={startRecording}
                  disabled={isProcessing}
                  className={cn(
                    'relative w-14 h-14 rounded-full flex items-center justify-center transition-all',
                    'shadow-lg hover:shadow-xl active:scale-95',
                    isProcessing
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-br from-[#c0392b] to-[#e74c3c] hover:from-[#a93226] hover:to-[#c0392b] text-white'
                  )}
                  aria-label="Start recording"
                >
                  {isProcessing ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                  {/* Pulse ring when idle */}
                  {!isProcessing && messages.length === 0 && (
                    <span className="absolute inset-0 rounded-full border-2 border-[#c0392b]/30 animate-ping" />
                  )}
                </button>

                {/* Placeholder for symmetry */}
                <div className="w-10" />
              </div>
            )}
          </div>
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
          <div className="bg-white rounded-2xl shadow-xl px-4 py-3 max-w-[220px] relative border border-gray-100">
            <p className="text-sm text-gray-800 font-medium leading-snug">
              Nǐ hǎo! வணக்கம்! 👋 Tap to talk — I speak your language!
            </p>
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45" />
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={toggleChat}
        className={cn(
          'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50',
          'transition-all duration-300 ease-in-out',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c0392b] focus-visible:ring-offset-2',
          isOpen ? 'w-14 h-14' : 'w-[56px] h-[70px] sm:w-[64px] sm:h-[80px]'
        )}
        aria-label={isOpen ? 'Close chat' : 'Open voice assistant'}
      >
        {isOpen ? (
          <div className="w-14 h-14 rounded-full bg-gray-600 hover:bg-gray-700 flex items-center justify-center shadow-lg">
            <X className="w-6 h-6 text-white" />
          </div>
        ) : (
          <div className="relative group">
            <div className="chat-lady-bounce">
              <img
                src={GREETING_LADY_URL}
                alt="Talk to Maami"
                className="w-[56px] h-[70px] sm:w-[64px] sm:h-[80px] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-110"
                loading="eager"
              />
            </div>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">1</span>
              </span>
            )}
          </div>
        )}
      </button>

      {/* Animations */}
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
