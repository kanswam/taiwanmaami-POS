/**
 * Text-to-Speech helper using OpenAI-compatible TTS API via Forge
 * Converts text to speech audio in multiple languages
 */
import { ENV } from "./_core/env";
import { storagePut } from "./storage";

export type TTSOptions = {
  text: string;
  /** Voice to use - 'nova' is warm and friendly */
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  /** Speed of speech (0.25 to 4.0) */
  speed?: number;
  /** Output format */
  format?: "mp3" | "opus" | "aac" | "flac";
};

export type TTSResult = {
  audioUrl: string;
  audioKey: string;
};

export type TTSError = {
  error: string;
  code: "SERVICE_ERROR" | "INVALID_INPUT" | "TTS_FAILED";
  details?: string;
};

/**
 * Convert text to speech using the Forge TTS API
 * Uses the 'nova' voice by default for a warm, friendly tone
 */
export async function textToSpeech(
  options: TTSOptions
): Promise<TTSResult | TTSError> {
  try {
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      return {
        error: "TTS service is not configured",
        code: "SERVICE_ERROR",
        details: "BUILT_IN_FORGE_API_URL or BUILT_IN_FORGE_API_KEY is not set",
      };
    }

    if (!options.text || options.text.trim().length === 0) {
      return {
        error: "No text provided for speech synthesis",
        code: "INVALID_INPUT",
      };
    }

    // Truncate very long text to avoid TTS limits (4096 chars typical limit)
    const text = options.text.length > 4000 ? options.text.slice(0, 4000) + "..." : options.text;

    const baseUrl = ENV.forgeApiUrl.endsWith("/")
      ? ENV.forgeApiUrl
      : `${ENV.forgeApiUrl}/`;

    const fullUrl = new URL("v1/audio/speech", baseUrl).toString();

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.forgeApiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: options.voice || "nova",
        speed: options.speed || 1.0,
        response_format: options.format || "mp3",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      return {
        error: "TTS service request failed",
        code: "TTS_FAILED",
        details: `${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`,
      };
    }

    // Get the audio buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to S3 with a unique key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const format = options.format || "mp3";
    const fileKey = `voice-chat/tts-${timestamp}-${randomSuffix}.${format}`;

    const { url, key } = await storagePut(fileKey, audioBuffer, `audio/${format}`);

    return {
      audioUrl: url,
      audioKey: key,
    };
  } catch (error) {
    return {
      error: "Text-to-speech failed",
      code: "SERVICE_ERROR",
      details: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Map language codes to optimal TTS voice
 * Nova is warm and friendly, works well across languages
 */
export function getVoiceForLanguage(_langCode: string): "nova" | "shimmer" | "alloy" {
  // Nova works well across all languages and has a warm, friendly tone
  return "nova";
}
