import { describe, it, expect } from 'vitest';
import { textToSpeech, getVoiceForLanguage } from './tts';

describe('TTS Helper', () => {
  describe('getVoiceForLanguage', () => {
    it('returns nova for English', () => {
      expect(getVoiceForLanguage('en')).toBe('nova');
    });

    it('returns nova for Tamil', () => {
      expect(getVoiceForLanguage('ta')).toBe('nova');
    });

    it('returns nova for Hindi', () => {
      expect(getVoiceForLanguage('hi')).toBe('nova');
    });

    it('returns nova for Chinese', () => {
      expect(getVoiceForLanguage('zh')).toBe('nova');
    });

    it('returns nova for unknown language', () => {
      expect(getVoiceForLanguage('xx')).toBe('nova');
    });
  });

  describe('textToSpeech input validation', () => {
    it('rejects empty text', async () => {
      const result = await textToSpeech({ text: '' });
      expect(result).toHaveProperty('error');
      expect((result as any).code).toBe('INVALID_INPUT');
    });

    it('rejects whitespace-only text', async () => {
      const result = await textToSpeech({ text: '   ' });
      expect(result).toHaveProperty('error');
      expect((result as any).code).toBe('INVALID_INPUT');
    });
  });
});

describe('Voice Chat Integration', () => {
  it('should have voiceChat procedure available', async () => {
    // Verify the chatbot router exports voiceChat
    const { appRouter } = await import('./routers');
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain('chatbot.voiceChat');
  });

  it('should have uploadAudio procedure available', async () => {
    const { appRouter } = await import('./routers');
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain('chatbot.uploadAudio');
  });

  it('should have chat procedure available', async () => {
    const { appRouter } = await import('./routers');
    const procedures = Object.keys((appRouter as any)._def.procedures);
    expect(procedures).toContain('chatbot.chat');
  });
});
