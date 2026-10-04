# RealEstate Voice Agent - Outbound Appointment Booking Bot

## 1. Project Overview

RealEstate Voice Agent is a portfolio-ready outbound AI calling project for real estate land sales appointment booking. It uses Vapi for phone-based voice automation, a Tamil-first conversational prompt, Twilio WhatsApp confirmations, a Node.js + Express backend, local JSON lead storage, and an optional Google Calendar integration.

The sample is designed for IVR, Conversational AI, Voice AI, and automation portfolios. It demonstrates lead qualification, objection handling, appointment booking, webhook/tool execution, WhatsApp follow-up, and call summary storage.

> Important: Use this only with opted-in leads and follow the calling, consent, and messaging rules that apply in your customer location.

## 2. Complete Folder Structure

```text
realestate-voice-agent/
├── config/
│   ├── vapi-assistant.json
│   └── vapi-tools.json
├── data/
│   └── leads.json
├── docs/
│   └── system-prompt.md
├── src/
│   ├── config/
│   │   └── env.js
│   ├── lib/
│   │   ├── asyncHandler.js
│   │   ├── httpError.js
│   │   └── logger.js
│   ├── services/
│   │   ├── calendarService.js
│   │   ├── leadStore.js
│   │   ├── vapiClient.js
│   │   └── whatsappService.js
│   ├── tools/
│   │   └── leadTools.js
│   └── server.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 3. Detailed System Prompt For The AI Voice Agent

The complete production-style system prompt is available in [`docs/system-prompt.md`](docs/system-prompt.md).

It covers:

- Tamil-first speaking rules with English fallback
- Professional AI identity and disclosure
- Greeting flow
- Lead qualification
- Budget, location, and timeline questions
- Objection handling for price, trust, timing, family approval, and location
- Appointment booking rules
- WhatsApp confirmation behavior
- Lead status update behavior
- Compliance and sensitive-data restrictions

Short excerpt:

```text
You are "Kavya", a professional outbound AI voice agent calling on behalf of {{businessName}} for real estate land sales appointment booking.

Tamil is the primary language. Use warm, natural spoken Tamil written in Tamil script when the customer speaks Tamil. Use simple English only if the customer speaks English or asks for English.

Your primary goal is to speak naturally, qualify the lead, handle objections with patience, and book a confirmed appointment for a site visit or sales consultation.
```

## 4. Full Backend Code

The backend is implemented with Node.js and Express.

Core files:

- [`src/server.js`](src/server.js) - Express app, routes, Vapi webhook receiver, error handling
- [`src/services/vapiClient.js`](src/services/vapiClient.js) - outbound Vapi call trigger
- [`src/services/leadStore.js`](src/services/leadStore.js) - local JSON lead storage
- [`src/services/whatsappService.js`](src/services/whatsappService.js) - Twilio WhatsApp send/dry-run service
- [`src/services/calendarService.js`](src/services/calendarService.js) - optional Google Calendar event creation
- [`src/tools/leadTools.js`](src/tools/leadTools.js) - Vapi function tools for booking, lead update, and WhatsApp
- [`src/config/env.js`](src/config/env.js) - environment config loader

Main backend capabilities:

- Load and update local lead data
- Trigger outbound Vapi calls
- Receive Vapi tool-call webhooks
- Book appointment records
- Send WhatsApp confirmations
- Save qualification notes and call status
- Save end-of-call summaries when Vapi sends call reports
- Run safely in mock mode before real credentials are added

## 5. Vapi Assistant Configuration

Use [`config/vapi-assistant.json`](config/vapi-assistant.json) as the assistant configuration template.

The sample assistant includes:

- GPT-4o model configuration
- Tamil-first first message
- ElevenLabs voice placeholder
- Deepgram multilingual transcription
- Express webhook URL
- Function definitions for booking, lead update, and WhatsApp

Before importing or creating the assistant in Vapi:

1. Replace `{{PUBLIC_BASE_URL}}` with your backend public URL.
2. Replace `YOUR_ELEVENLABS_TAMIL_VOICE_ID` with an ElevenLabs voice ID enabled in your Vapi account.
3. Paste the full prompt from [`docs/system-prompt.md`](docs/system-prompt.md) into the assistant system message if you want the strongest version.
4. Set your Vapi assistant ID in `.env`.

Model option:

```json
{
  "model": {
    "provider": "openai",
    "model": "gpt-4o"
  }
}
```

If your Vapi account has Anthropic enabled, you can switch the provider and model in the Vapi dashboard or API.

## 6. API Endpoint To Trigger Outbound Call

Endpoint:

```http
POST /api/calls/outbound
```

Call an existing lead:

```bash
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{"leadId":"lead_1001"}'
```

Create a lead and call immediately:

```bash
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{
    "lead": {
      "name": "Suresh R",
      "phone": "+15550109999",
      "language": "ta-IN",
      "interest": "Residential plot",
      "budget": "20-25 lakhs",
      "preferredLocation": "Oragadam",
      "timeline": "This month"
    }
  }'
```

Schedule a Vapi call:

```bash
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_1002",
    "schedulePlan": {
      "earliestAt": "2026-10-05T10:00:00+05:30"
    }
  }'
```

By default, `.env.example` sets `VAPI_MOCK_CALLS=true`, so these requests update the local JSON store without placing a real phone call.

## 7. Function/Tools Definition

Tool definitions are available in [`config/vapi-tools.json`](config/vapi-tools.json) and mirrored in [`src/tools/leadTools.js`](src/tools/leadTools.js).

### `bookAppointment`

Books a confirmed appointment only after the customer agrees to date and time.

Required fields:

- `leadId`
- `date`
- `time`
- `confirmedByCustomer`

Side effects:

- Updates lead status to `appointment_booked`
- Stores appointment details
- Creates Google Calendar event when enabled
- Sends WhatsApp confirmation

### `updateLead`

Stores qualification and final call status.

Useful fields:

- `status`
- `interestLevel`
- `budget`
- `preferredLocation`
- `timeline`
- `objections`
- `notes`
- `callSummary`

### `sendWhatsApp`

Sends or dry-runs a WhatsApp message through Twilio.

Required fields:

- `to`
- `message`

The backend also exposes manual test endpoints:

```http
GET  /api/tools
POST /api/tools/book-appointment
POST /api/tools/update-lead
POST /api/tools/send-whatsapp
POST /webhooks/vapi
```

## 8. `.env.example` File

Copy the template:

```bash
cp .env.example .env
```

Key variables:

```env
PORT=3000
PUBLIC_BASE_URL=https://your-ngrok-or-production-url.com
LEADS_FILE_PATH=./data/leads.json

VAPI_API_KEY=your_vapi_private_api_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
VAPI_PHONE_NUMBER_ID=your_vapi_phone_number_id
VAPI_BASE_URL=https://api.vapi.ai
VAPI_MOCK_CALLS=true

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+15550100000
WHATSAPP_DRY_RUN=true

GOOGLE_CALENDAR_ENABLED=false
GOOGLE_CALENDAR_ID=primary
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

## 9. Sample Leads Data

Sample data is stored in [`data/leads.json`](data/leads.json).

Example lead:

```json
{
  "id": "lead_1001",
  "name": "Arun Kumar",
  "phone": "+15550101001",
  "language": "ta-IN",
  "source": "Facebook Lead Form",
  "interest": "Residential land",
  "budget": "15-20 lakhs",
  "preferredLocation": "Oragadam",
  "timeline": "Within 3 months",
  "status": "new"
}
```

## 10. Complete README.md

You are reading the complete README. This section also includes setup, run, test, demo, and improvement instructions so the project can be presented directly in a portfolio, Fiverr gig, Upwork proposal, or CV.

### Features

- Outbound AI phone call trigger through Vapi
- Tamil-first, English-supported voice agent prompt
- Professional greeting and AI disclosure behavior
- Lead qualification for land sales
- Objection handling for price, trust, timing, family approval, and location
- Appointment booking tool
- WhatsApp confirmation tool
- Lead status and call summary storage
- Local JSON storage for easy demo setup
- Optional Google Calendar event creation
- Safe mock mode for demos without paid calling

### Tech Stack

- Vapi.ai for voice assistant and outbound calls
- Twilio for WhatsApp confirmation
- ElevenLabs for Tamil + English voice
- GPT-4o as the sample LLM configuration
- Node.js 20+
- Express.js
- Local JSON storage
- Google Calendar API as an optional integration

### Setup Instructions

Install dependencies:

```bash
npm install
```

Create environment file:

```bash
cp .env.example .env
```

Start in mock mode:

```bash
npm run dev
```

Check server health:

```bash
curl http://localhost:3000/health
```

List sample leads:

```bash
curl http://localhost:3000/api/leads
```

### How To Run And Test

Run a mock outbound call:

```bash
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{"leadId":"lead_1001"}'
```

Test appointment booking without Vapi:

```bash
curl -X POST http://localhost:3000/api/tools/book-appointment \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_1001",
    "date": "2026-10-06",
    "time": "16:30",
    "timezone": "Asia/Kolkata",
    "location": "Oragadam Site Office",
    "notes": "Customer wants DTCP document details.",
    "confirmedByCustomer": true
  }'
```

Test WhatsApp dry-run:

```bash
curl -X POST http://localhost:3000/api/tools/send-whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead_1001",
    "to": "+15550101001",
    "message": "Vanakkam Arun, your site visit appointment is confirmed."
  }'
```

Run syntax checks:

```bash
npm run check
```

### How To Connect Vapi

1. Create or import a Twilio phone number into Vapi.
2. Create a Vapi assistant using [`config/vapi-assistant.json`](config/vapi-assistant.json).
3. Set the assistant server URL to:

```text
https://your-public-url.com/webhooks/vapi
```

4. Use ngrok or another tunnel for local testing:

```bash
ngrok http 3000
```

5. Update `.env`:

```env
PUBLIC_BASE_URL=https://your-ngrok-url.ngrok-free.app
VAPI_API_KEY=...
VAPI_ASSISTANT_ID=...
VAPI_PHONE_NUMBER_ID=...
VAPI_MOCK_CALLS=false
```

6. Trigger:

```bash
curl -X POST http://localhost:3000/api/calls/outbound \
  -H "Content-Type: application/json" \
  -d '{"leadId":"lead_1001"}'
```

### How To Demo This Project

For a portfolio video or client demo:

1. Show the README and architecture.
2. Open [`docs/system-prompt.md`](docs/system-prompt.md) and highlight Tamil-first conversation design.
3. Show [`config/vapi-assistant.json`](config/vapi-assistant.json) with model, voice, webhook, and tools.
4. Start the backend with `npm run dev`.
5. Call `GET /api/leads` to show lead data.
6. Trigger `POST /api/calls/outbound` in mock mode.
7. Test `POST /api/tools/book-appointment`.
8. Show that [`data/leads.json`](data/leads.json) updates with appointment and history.
9. Explain how Vapi sends tool calls to `/webhooks/vapi`.
10. Switch from dry-run to live mode only when Vapi and Twilio credentials are ready.

### Future Improvements

- Supabase database adapter
- Dashboard UI for lead upload and campaign monitoring
- CSV import/export
- Real Google Calendar availability lookup before booking
- Admin authentication
- Call analytics dashboard
- Retry queue for failed WhatsApp messages
- Human handoff to sales consultant
- CRM integrations such as HubSpot, Zoho, or Salesforce
- Multilingual prompt variants for Telugu, Hindi, Malayalam, and Kannada

### Reference Links

- [Vapi outbound calling documentation](https://docs.vapi.ai/calls/outbound-calling)
- [Vapi server events and tool calls](https://docs.vapi.ai/server-url/events)
- [Vapi model providers](https://docs.vapi.ai/providers/model/overview)
- [Vapi ElevenLabs voice provider](https://docs.vapi.ai/providers/voice/elevenlabs)
