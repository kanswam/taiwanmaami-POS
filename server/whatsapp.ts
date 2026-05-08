/**
 * Twilio WhatsApp Integration
 * 
 * Sends WhatsApp messages via Twilio sandbox.
 * Used for daily digest delivery to owner's phone.
 */

import { ENV } from "./_core/env";

interface WhatsAppMessage {
  to?: string;    // Override recipient (defaults to TWILIO_WHATSAPP_TO)
  body: string;   // Message text (max 1600 chars for WhatsApp)
}

interface WhatsAppResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsApp(message: WhatsAppMessage): Promise<WhatsAppResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  const toNumber = message.to || process.env.TWILIO_WHATSAPP_TO;

  if (!accountSid || !authToken || !fromNumber || !toNumber) {
    console.error("[WhatsApp] Missing Twilio configuration:", {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasFrom: !!fromNumber,
      hasTo: !!toNumber,
    });
    return { success: false, error: "Missing Twilio configuration" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const params = new URLSearchParams();
  params.append("From", `whatsapp:${fromNumber}`);
  params.append("To", `whatsapp:${toNumber}`);
  params.append("Body", message.body);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[WhatsApp] Message sent successfully. SID: ${data.sid}`);
      return { success: true, sid: data.sid };
    } else {
      console.error(`[WhatsApp] Failed to send message:`, data.message || data);
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }
  } catch (err: any) {
    console.error(`[WhatsApp] Error sending message:`, err.message);
    return { success: false, error: err.message };
  }
}
