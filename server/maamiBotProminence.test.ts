import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for Maami Bot prominence improvements.
 * Verifies that the bot is more visible and engaging for customers.
 */

describe('Maami Bot Prominence Improvements', () => {
  const voiceChatWidget = readFileSync(
    resolve(__dirname, '../client/src/components/VoiceChatWidget.tsx'),
    'utf-8'
  );
  const menuPage = readFileSync(
    resolve(__dirname, '../client/src/pages/Menu.tsx'),
    'utf-8'
  );

  describe('Auto-open for first-time visitors', () => {
    it('should check localStorage for first visit flag', () => {
      expect(voiceChatWidget).toContain('FIRST_VISIT_KEY');
      expect(voiceChatWidget).toContain("localStorage.getItem(FIRST_VISIT_KEY)");
    });

    it('should auto-open chat after 5 seconds for first-time visitors', () => {
      expect(voiceChatWidget).toContain('setIsOpen(true)');
      expect(voiceChatWidget).toContain('setAutoOpened(true)');
      expect(voiceChatWidget).toContain('5000');
    });

    it('should set a welcome message with menu recommendations, store info, events, and delivery info', () => {
      expect(voiceChatWidget).toContain("Welcome to Taiwan Maami!");
      expect(voiceChatWidget).toContain("Menu recommendations");
      expect(voiceChatWidget).toContain("Store hours & locations");
      expect(voiceChatWidget).toContain("Events & workshops");
      expect(voiceChatWidget).toContain("Delivery & pickup info");
    });

    it('should mark first visit as done in localStorage', () => {
      expect(voiceChatWidget).toContain("localStorage.setItem(FIRST_VISIT_KEY, 'true')");
    });
  });

  describe('Page-contextual greeting messages', () => {
    it('should import useLocation from wouter', () => {
      expect(voiceChatWidget).toContain("import { useLocation } from 'wouter'");
    });

    it('should have a getGreetingForPage function', () => {
      expect(voiceChatWidget).toContain('function getGreetingForPage');
    });

    it('should have contextual messages for menu page', () => {
      expect(voiceChatWidget).toContain("Not sure what to order?");
      expect(voiceChatWidget).toContain("Help me choose");
    });

    it('should have contextual messages for locations page', () => {
      expect(voiceChatWidget).toContain("Want to know our hours");
      expect(voiceChatWidget).toContain("Ask about locations");
    });

    it('should have contextual messages for events/workshops page', () => {
      expect(voiceChatWidget).toContain("events or workshops");
    });

    it('should have contextual messages for wholesale page', () => {
      expect(voiceChatWidget).toContain("wholesale orders");
    });

    it('should have a default greeting for other pages', () => {
      expect(voiceChatWidget).toContain("Need help with our menu or ordering?");
    });
  });

  describe('Persistent greeting bubble', () => {
    it('should auto-dismiss greeting after 10 seconds instead of on scroll', () => {
      expect(voiceChatWidget).toContain('10000');
      expect(voiceChatWidget).toContain('greetingDismissTimerRef');
    });

    it('should track greeting per page in session storage', () => {
      expect(voiceChatWidget).toContain('SESSION_GREETING_KEY');
      expect(voiceChatWidget).toContain('sessionStorage.getItem');
      expect(voiceChatWidget).toContain('sessionStorage.setItem');
    });
  });

  describe('Bigger floating button with mobile label', () => {
    it('should show Ask Maami label on all screens (no hidden sm: prefix)', () => {
      // The old version had "hidden sm:flex" which hid the label on mobile
      // The new version should show it on all screens
      const labelSection = voiceChatWidget.match(/Ask Maami[\s\S]{0,200}/);
      expect(labelSection).not.toBeNull();
      // Should NOT have "hidden sm:flex" before the Ask Maami label
      expect(voiceChatWidget).not.toContain('hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 mb-');
    });

    it('should have a larger bot image than before', () => {
      // New sizes should be larger: 68x85 mobile, 76x95 desktop (was 56x70 / 64x80)
      expect(voiceChatWidget).toContain('w-[68px]');
      expect(voiceChatWidget).toContain('h-[85px]');
      expect(voiceChatWidget).toContain('sm:w-[76px]');
      expect(voiceChatWidget).toContain('sm:h-[95px]');
    });

    it('should have pulsing animations for the label and glow', () => {
      expect(voiceChatWidget).toContain('chat-label-pulse');
      expect(voiceChatWidget).toContain('chat-glow');
      expect(voiceChatWidget).toContain('@keyframes labelPulse');
      expect(voiceChatWidget).toContain('@keyframes chatGlow');
    });
  });

  describe('Menu page inline CTA', () => {
    it('should have a "Not sure what to order?" CTA banner', () => {
      expect(menuPage).toContain('Not sure what to order?');
      expect(menuPage).toContain('Ask Maami Bot for personalized recommendations');
    });

    it('should import Sparkles icon for the CTA', () => {
      expect(menuPage).toContain('Sparkles');
    });

    it('should open the chat widget when CTA is clicked', () => {
      expect(menuPage).toContain('Open chat assistant');
      expect(menuPage).toContain('chatBtn.click()');
    });
  });
});
