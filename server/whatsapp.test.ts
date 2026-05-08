import { describe, it, expect } from "vitest";

/**
 * Test Twilio WhatsApp credentials by calling the Twilio API
 * to verify the account SID and auth token are valid.
 */
describe("WhatsApp / Twilio credentials", () => {
  it("should authenticate with Twilio API using provided credentials", async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    expect(accountSid).toBeTruthy();
    expect(authToken).toBeTruthy();

    // Call Twilio's account endpoint to verify credentials
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const response = await fetch(url, {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.sid).toBe(accountSid);
    expect(data.status).toBe("active");
  });

  it("should have WhatsApp from and to numbers configured", () => {
    expect(process.env.TWILIO_WHATSAPP_FROM).toBeTruthy();
    expect(process.env.TWILIO_WHATSAPP_TO).toBeTruthy();
    // Verify format
    expect(process.env.TWILIO_WHATSAPP_FROM).toMatch(/^\+\d+$/);
    expect(process.env.TWILIO_WHATSAPP_TO).toMatch(/^\+\d+$/);
  });
});
