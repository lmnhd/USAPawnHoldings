import twilio, { Twilio } from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: Twilio | null = null;

if (accountSid && authToken) {
  twilioClient = twilio(accountSid, authToken);
}

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (value.startsWith("+")) {
    return value;
  }
  return `+${digits}`;
}

export async function sendSMS(to: string, body: string) {
  const toFormatted = formatPhoneNumber(to);

  if (!twilioClient || !fromNumber) {
    console.warn("Twilio is not configured. SMS skipped.", {
      to: toFormatted,
      body,
      accountSid: accountSid ? "set" : "missing",
      authToken: authToken ? "set" : "missing", 
      fromNumber: fromNumber ? "set" : "missing",
    });
    return { success: false, reason: "twilio_not_configured" };
  }

  try {
    console.log("Sending SMS via Twilio", { to: toFormatted, fromNumber });
    const message = await twilioClient.messages.create({
      to: toFormatted,
      from: fromNumber,
      body,
    });

    console.log("SMS sent successfully", { sid: message.sid, to: toFormatted });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error("Twilio sendSMS failed", { 
      error: error instanceof Error ? error.message : String(error),
      to: toFormatted,
      fromNumber,
      twilioConfigured: twilioClient ? "yes" : "no"
    });
    return { success: false, reason: "send_failed" };
  }
}
