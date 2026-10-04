import { z } from "zod";
import { config } from "../config/env.js";
import { leadStore } from "../services/leadStore.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { createCalendarEvent } from "../services/calendarService.js";

const bookAppointmentSchema = z.object({
  leadId: z.string(),
  date: z.string().describe("Appointment date in YYYY-MM-DD format"),
  time: z.string().describe("Appointment time in 24-hour HH:mm format"),
  timezone: z.string().default(config.business.timezone),
  location: z.string().optional(),
  notes: z.string().optional(),
  confirmedByCustomer: z.boolean().default(true)
});

const updateLeadSchema = z.object({
  leadId: z.string(),
  status: z.string().optional(),
  interestLevel: z.enum(["hot", "warm", "cold", "not_interested"]).optional(),
  budget: z.string().optional(),
  preferredLocation: z.string().optional(),
  timeline: z.string().optional(),
  objections: z.array(z.string()).optional(),
  notes: z.string().optional(),
  callSummary: z.string().optional()
});

const sendWhatsAppSchema = z.object({
  leadId: z.string().optional(),
  to: z.string(),
  message: z.string().min(1)
});

const appointmentMessage = ({ lead, appointment }) => [
  `Vanakkam ${lead.name}, your appointment with ${config.business.name} is confirmed.`,
  `Date: ${appointment.date}`,
  `Time: ${appointment.time} (${appointment.timezone || config.business.timezone})`,
  `Location: ${appointment.location || lead.preferredLocation || config.business.location}`,
  `For help, call ${config.business.callbackNumber}.`
].join("\n");

export const toolDefinitions = [
  {
    name: "bookAppointment",
    description: "Book a site visit or callback appointment after the customer clearly agrees to a date and time.",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string", description: "Lead ID from the call context." },
        date: { type: "string", description: "Confirmed appointment date in YYYY-MM-DD format." },
        time: { type: "string", description: "Confirmed appointment time in 24-hour HH:mm format." },
        timezone: { type: "string", description: "IANA timezone, default Asia/Kolkata." },
        location: { type: "string", description: "Site/project location or office location." },
        notes: { type: "string", description: "Any important appointment notes." },
        confirmedByCustomer: { type: "boolean", description: "True only if customer agreed to this appointment." }
      },
      required: ["leadId", "date", "time", "confirmedByCustomer"]
    }
  },
  {
    name: "updateLead",
    description: "Update qualification fields, objections, call notes, and final lead status.",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        status: { type: "string", description: "new, interested, appointment_booked, follow_up, not_interested, wrong_number, unreachable." },
        interestLevel: { type: "string", enum: ["hot", "warm", "cold", "not_interested"] },
        budget: { type: "string" },
        preferredLocation: { type: "string" },
        timeline: { type: "string" },
        objections: { type: "array", items: { type: "string" } },
        notes: { type: "string" },
        callSummary: { type: "string" }
      },
      required: ["leadId"]
    }
  },
  {
    name: "sendWhatsApp",
    description: "Send a concise WhatsApp confirmation or follow-up message to the lead.",
    parameters: {
      type: "object",
      properties: {
        leadId: { type: "string" },
        to: { type: "string", description: "Customer phone number in E.164 format." },
        message: { type: "string", description: "WhatsApp message body." }
      },
      required: ["to", "message"]
    }
  }
];

export const leadTools = {
  async bookAppointment(input) {
    const appointment = bookAppointmentSchema.parse(input);
    if (!appointment.confirmedByCustomer) {
      return { status: "skipped", message: "Appointment was not booked because customer confirmation was false." };
    }

    const lead = await leadStore.findById(appointment.leadId);
    const savedLead = await leadStore.bookAppointment(lead.id, appointment);
    const calendar = await createCalendarEvent({ lead: savedLead, appointment });
    const whatsapp = await sendWhatsAppMessage({
      to: savedLead.phone,
      body: appointmentMessage({ lead: savedLead, appointment })
    });

    return {
      status: "appointment_booked",
      leadId: savedLead.id,
      appointment: savedLead.appointment,
      calendar,
      whatsapp
    };
  },

  async updateLead(input) {
    const update = updateLeadSchema.parse(input);
    const patch = {
      ...(update.status ? { status: update.status } : {}),
      ...(update.budget ? { budget: update.budget } : {}),
      ...(update.preferredLocation ? { preferredLocation: update.preferredLocation } : {}),
      ...(update.timeline ? { timeline: update.timeline } : {}),
      qualification: {
        interestLevel: update.interestLevel,
        objections: update.objections || [],
        callSummary: update.callSummary || "",
        updatedAt: new Date().toISOString()
      },
      notes: [update.notes, update.callSummary].filter(Boolean).join("\n")
    };
    const lead = await leadStore.update(update.leadId, patch, "lead_qualified");
    return { status: "updated", lead };
  },

  async sendWhatsApp(input) {
    const request = sendWhatsAppSchema.parse(input);
    const result = await sendWhatsAppMessage({
      to: request.to,
      body: request.message
    });

    if (request.leadId) {
      await leadStore.update(request.leadId, {
        lastWhatsApp: {
          at: new Date().toISOString(),
          to: request.to,
          status: result.status
        }
      }, "whatsapp_sent");
    }

    return result;
  }
};

export const executeToolCall = async ({ name, parameters }) => {
  const tool = leadTools[name];
  if (!tool) {
    return { status: "error", message: `Unknown tool '${name}'` };
  }
  return tool(parameters || {});
};
