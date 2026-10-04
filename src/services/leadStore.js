import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config/env.js";
import { notFound } from "../lib/httpError.js";

const nowIso = () => new Date().toISOString();

class LeadStore {
  constructor(filePath = config.storage.leadsFilePath) {
    this.filePath = filePath;
    this.writeQueue = Promise.resolve();
  }

  async ensureFile() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, "[]\n", "utf8");
    }
  }

  async readAll() {
    await this.ensureFile();
    const raw = await fs.readFile(this.filePath, "utf8");
    return JSON.parse(raw || "[]");
  }

  async writeAll(leads) {
    await this.ensureFile();
    const tmpPath = `${this.filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(tmpPath, `${JSON.stringify(leads, null, 2)}\n`, "utf8");
    await fs.rename(tmpPath, this.filePath);
  }

  async updateWith(mutator) {
    this.writeQueue = this.writeQueue.then(async () => {
      const leads = await this.readAll();
      const result = await mutator(leads);
      await this.writeAll(leads);
      return result;
    });
    return this.writeQueue;
  }

  async list() {
    return this.readAll();
  }

  async findById(id) {
    const leads = await this.readAll();
    const lead = leads.find((item) => item.id === id);
    if (!lead) throw notFound(`Lead '${id}' was not found`);
    return lead;
  }

  async create(input) {
    return this.updateWith((leads) => {
      const lead = {
        id: input.id || `lead_${randomUUID().slice(0, 8)}`,
        name: input.name || "Unknown Lead",
        phone: input.phone,
        language: input.language || "ta-IN",
        source: input.source || "Manual Upload",
        interest: input.interest || "",
        budget: input.budget || "",
        preferredLocation: input.preferredLocation || "",
        timeline: input.timeline || "",
        status: input.status || "new",
        notes: input.notes || "",
        appointment: null,
        lastCall: null,
        history: [
          {
            at: nowIso(),
            type: "lead_created",
            note: "Lead created through API"
          }
        ]
      };
      leads.push(lead);
      return lead;
    });
  }

  async update(id, patch, eventType = "lead_updated") {
    return this.updateWith((leads) => {
      const lead = leads.find((item) => item.id === id);
      if (!lead) throw notFound(`Lead '${id}' was not found`);

      Object.assign(lead, patch);
      lead.history = lead.history || [];
      lead.history.push({
        at: nowIso(),
        type: eventType,
        patch
      });
      return lead;
    });
  }

  async recordCallQueued(id, call) {
    return this.update(id, {
      status: "call_queued",
      lastCall: {
        callId: call.id,
        provider: call.provider,
        queuedAt: nowIso(),
        status: "queued"
      }
    }, "call_queued");
  }

  async recordCallSummary(id, summary) {
    return this.update(id, {
      status: summary.status || "call_completed",
      lastCall: {
        ...(summary.lastCall || {}),
        callId: summary.callId,
        status: summary.status || "completed",
        endedAt: nowIso(),
        summary: summary.summary || "",
        transcript: summary.transcript || "",
        recordingUrl: summary.recordingUrl || ""
      }
    }, "call_summary_saved");
  }

  async bookAppointment(id, appointment) {
    return this.update(id, {
      status: "appointment_booked",
      appointment: {
        ...appointment,
        bookedAt: nowIso()
      }
    }, "appointment_booked");
  }
}

export const leadStore = new LeadStore();
export { LeadStore };
