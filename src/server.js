import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { z } from "zod";
import { config } from "./config/env.js";
import { asyncHandler } from "./lib/asyncHandler.js";
import { badRequest } from "./lib/httpError.js";
import { logger } from "./lib/logger.js";
import { leadStore } from "./services/leadStore.js";
import { createOutboundCall } from "./services/vapiClient.js";
import { executeToolCall, leadTools, toolDefinitions } from "./tools/leadTools.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("tiny"));

const outboundCallSchema = z.object({
  leadId: z.string().optional(),
  phoneNumber: z.string().optional(),
  lead: z.object({
    name: z.string(),
    phone: z.string(),
    language: z.string().optional(),
    source: z.string().optional(),
    interest: z.string().optional(),
    budget: z.string().optional(),
    preferredLocation: z.string().optional(),
    timeline: z.string().optional(),
    notes: z.string().optional()
  }).optional(),
  schedulePlan: z.object({
    earliestAt: z.string(),
    latestAt: z.string().optional()
  }).optional()
}).refine((data) => data.leadId || data.lead || data.phoneNumber, {
  message: "Provide leadId, lead, or phoneNumber."
});

const normalizeToolCalls = (message) => {
  if (Array.isArray(message.toolCallList)) return message.toolCallList;
  if (Array.isArray(message.toolWithToolCallList)) {
    return message.toolWithToolCallList.map((item) => ({
      id: item.toolCall?.id,
      name: item.name,
      parameters: item.toolCall?.parameters || {}
    }));
  }
  return [];
};

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "realestate-voice-agent",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/leads", asyncHandler(async (req, res) => {
  res.json(await leadStore.list());
}));

app.get("/api/leads/:leadId", asyncHandler(async (req, res) => {
  res.json(await leadStore.findById(req.params.leadId));
}));

app.post("/api/leads", asyncHandler(async (req, res) => {
  const lead = await leadStore.create(req.body);
  res.status(201).json(lead);
}));

app.get("/api/tools", (req, res) => {
  res.json({ tools: toolDefinitions });
});

app.post("/api/calls/outbound", asyncHandler(async (req, res) => {
  const request = outboundCallSchema.parse(req.body);

  let lead;
  if (request.leadId) {
    lead = await leadStore.findById(request.leadId);
  } else if (request.lead) {
    lead = await leadStore.create(request.lead);
  } else {
    lead = await leadStore.create({
      name: "Manual outbound lead",
      phone: request.phoneNumber,
      source: "Manual API Trigger"
    });
  }

  const call = await createOutboundCall({
    lead,
    phoneNumber: request.phoneNumber,
    schedulePlan: request.schedulePlan
  });
  await leadStore.recordCallQueued(lead.id, call);

  res.status(202).json({
    status: "queued",
    leadId: lead.id,
    callId: call.id,
    provider: call.provider,
    call
  });
}));

app.post("/api/tools/book-appointment", asyncHandler(async (req, res) => {
  res.json(await leadTools.bookAppointment(req.body));
}));

app.post("/api/tools/update-lead", asyncHandler(async (req, res) => {
  res.json(await leadTools.updateLead(req.body));
}));

app.post("/api/tools/send-whatsapp", asyncHandler(async (req, res) => {
  res.json(await leadTools.sendWhatsApp(req.body));
}));

app.post("/webhooks/vapi", asyncHandler(async (req, res) => {
  const message = req.body?.message || {};
  logger.info("Received Vapi webhook", { type: message.type, callId: message.call?.id });

  if (message.type === "tool-calls") {
    const results = await Promise.all(normalizeToolCalls(message).map(async (toolCall) => {
      const result = await executeToolCall({
        name: toolCall.name,
        parameters: toolCall.parameters
      });
      return {
        name: toolCall.name,
        toolCallId: toolCall.id,
        result: JSON.stringify(result)
      };
    }));
    return res.json({ results });
  }

  if (["end-of-call-report", "call.ended"].includes(message.type)) {
    const leadId = message.call?.assistantOverrides?.variableValues?.leadId
      || message.call?.metadata?.leadId
      || message.artifact?.messages?.find?.((item) => item.role === "system")?.leadId;

    if (leadId) {
      await leadStore.recordCallSummary(leadId, {
        callId: message.call?.id,
        status: "call_completed",
        summary: message.analysis?.summary || message.summary || "",
        transcript: message.artifact?.transcript || "",
        recordingUrl: message.artifact?.recordingUrl || ""
      });
    }
  }

  res.json({ received: true });
}));

app.use((req, res, next) => {
  next(badRequest(`Route not found: ${req.method} ${req.path}`));
});

app.use((error, req, res, next) => {
  const statusCode = error.statusCode || (error.name === "ZodError" ? 400 : 500);
  const payload = {
    error: error.message || "Internal server error",
    details: error.errors || error.details
  };
  logger.error("Request failed", { statusCode, payload });
  res.status(statusCode).json(payload);
});

app.listen(config.server.port, () => {
  logger.info("RealEstate Voice Agent backend started", {
    port: config.server.port,
    publicBaseUrl: config.server.publicBaseUrl
  });
});
