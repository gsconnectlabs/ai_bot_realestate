import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

const bool = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
};

const rootPath = process.cwd();

export const config = {
  server: {
    port: Number(process.env.PORT || 3000),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`
  },
  storage: {
    leadsFilePath: path.resolve(rootPath, process.env.LEADS_FILE_PATH || "./data/leads.json")
  },
  vapi: {
    baseUrl: process.env.VAPI_BASE_URL || "https://api.vapi.ai",
    apiKey: process.env.VAPI_API_KEY || "",
    assistantId: process.env.VAPI_ASSISTANT_ID || "",
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID || "",
    mockCalls: bool(process.env.VAPI_MOCK_CALLS, true)
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM || "",
    dryRun: bool(process.env.WHATSAPP_DRY_RUN, true)
  },
  calendar: {
    enabled: bool(process.env.GOOGLE_CALENDAR_ENABLED, false),
    calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    privateKey: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  },
  business: {
    name: process.env.BUSINESS_NAME || "Sri Velan Properties",
    callbackNumber: process.env.BUSINESS_CALLBACK_NUMBER || "+919876543210",
    location: process.env.BUSINESS_LOCATION || "Chennai",
    timezone: process.env.DEFAULT_TIMEZONE || "Asia/Kolkata"
  }
};

export const requireConfig = (value, name) => {
  if (!value) {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return value;
};
