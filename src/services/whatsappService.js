import twilio from "twilio";
import { config } from "../config/env.js";

const withWhatsappPrefix = (phone) => {
  if (!phone) return phone;
  return phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
};

export const sendWhatsAppMessage = async ({ to, body }) => {
  if (config.twilio.dryRun || !config.twilio.accountSid || !config.twilio.authToken || !config.twilio.whatsappFrom) {
    return {
      status: "dry_run",
      to: withWhatsappPrefix(to),
      body,
      message: "WhatsApp dry run. Add Twilio credentials and set WHATSAPP_DRY_RUN=false to send."
    };
  }

  const client = twilio(config.twilio.accountSid, config.twilio.authToken);
  const message = await client.messages.create({
    from: config.twilio.whatsappFrom,
    to: withWhatsappPrefix(to),
    body
  });

  return {
    status: "sent",
    sid: message.sid,
    to: message.to
  };
};
