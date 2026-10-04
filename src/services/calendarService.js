import { google } from "googleapis";
import { config } from "../config/env.js";

const toDateTime = ({ date, time, timezone }) => {
  const localTime = `${date}T${time?.length === 5 ? `${time}:00` : time}`;
  return {
    dateTime: localTime,
    timeZone: timezone || config.business.timezone
  };
};

export const createCalendarEvent = async ({ lead, appointment }) => {
  if (!config.calendar.enabled) {
    return {
      status: "dry_run",
      provider: "google-calendar",
      message: "Calendar dry run. Set GOOGLE_CALENDAR_ENABLED=true and add service account credentials to create events."
    };
  }

  const auth = new google.auth.JWT({
    email: config.calendar.serviceAccountEmail,
    key: config.calendar.privateKey,
    scopes: ["https://www.googleapis.com/auth/calendar"]
  });

  const calendar = google.calendar({ version: "v3", auth });
  const start = toDateTime({
    date: appointment.date,
    time: appointment.time,
    timezone: appointment.timezone
  });

  const [hour, minute] = appointment.time.split(":").map(Number);
  const endHour = String(hour + 1).padStart(2, "0");
  const end = toDateTime({
    date: appointment.date,
    time: `${endHour}:${String(minute || 0).padStart(2, "0")}`,
    timezone: appointment.timezone
  });

  const response = await calendar.events.insert({
    calendarId: config.calendar.calendarId,
    requestBody: {
      summary: `Site Visit: ${lead.name} - ${appointment.location || lead.preferredLocation || "Land Project"}`,
      description: [
        `Lead ID: ${lead.id}`,
        `Phone: ${lead.phone}`,
        `Budget: ${lead.budget || "Not captured"}`,
        `Interest: ${lead.interest || "Land enquiry"}`,
        `Notes: ${appointment.notes || lead.notes || ""}`
      ].join("\n"),
      start,
      end
    }
  });

  return {
    status: "created",
    provider: "google-calendar",
    eventId: response.data.id,
    htmlLink: response.data.htmlLink
  };
};
