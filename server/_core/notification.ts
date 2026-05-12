import { TRPCError } from "@trpc/server";
import { sendWhatsApp } from "../whatsapp";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification via Twilio WhatsApp.
 * Returns `true` if the message was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to other channels). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 *
 * WhatsApp messages are capped at 1600 characters, so long content is truncated
 * with a note indicating the full message was trimmed.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // WhatsApp has a 1600-char limit per message.
  // Format: "🔔 {title}\n\n{content}" — truncate content if needed.
  const header = `🔔 *${title}*`;
  const maxContentLen = 1600 - header.length - 4; // 4 for "\n\n" + buffer
  const truncatedContent =
    content.length > maxContentLen
      ? content.slice(0, maxContentLen - 30) + "\n\n_(message truncated)_"
      : content;

  const body = `${header}\n\n${truncatedContent}`;

  try {
    const result = await sendWhatsApp({ body });

    if (!result.success) {
      console.warn(
        `[Notification] WhatsApp delivery failed: ${result.error}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("[Notification] Error sending WhatsApp notification:", error);
    return false;
  }
}
