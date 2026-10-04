import { config, requireConfig } from "../config/env.js";

export const createOutboundCall = async ({ lead, phoneNumber, schedulePlan }) => {
  const assistantId = config.vapi.assistantId || "mock_assistant_id";
  const phoneNumberId = config.vapi.phoneNumberId || "mock_phone_number_id";
  const destinationNumber = phoneNumber || lead.phone;

  const payload = {
    assistantId,
    phoneNumberId,
    customer: {
      number: destinationNumber,
      name: lead.name
    },
    assistantOverrides: {
      variableValues: {
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: destinationNumber,
        leadInterest: lead.interest || "",
        leadBudget: lead.budget || "",
        leadPreferredLocation: lead.preferredLocation || "",
        leadTimeline: lead.timeline || "",
        businessName: config.business.name,
        businessCallbackNumber: config.business.callbackNumber
      }
    }
  };

  if (schedulePlan?.earliestAt) {
    payload.schedulePlan = schedulePlan;
  }

  if (config.vapi.mockCalls) {
    return {
      id: `mock_call_${Date.now()}`,
      provider: "vapi-mock",
      request: payload,
      message: "Mock mode is enabled. Set VAPI_MOCK_CALLS=false to place real calls."
    };
  }

  requireConfig(config.vapi.assistantId, "VAPI_ASSISTANT_ID");
  requireConfig(config.vapi.phoneNumberId, "VAPI_PHONE_NUMBER_ID");
  requireConfig(config.vapi.apiKey, "VAPI_API_KEY");

  const response = await fetch(`${config.vapi.baseUrl}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.vapi.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Vapi call failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return {
    id: body.id,
    provider: "vapi",
    request: payload,
    response: body
  };
};
