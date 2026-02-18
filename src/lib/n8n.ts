const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook-test/800af2a6-550c-48ab-8711-87d164792b69";

if (!process.env.N8N_WEBHOOK_URL) {
  console.warn(
    "N8N_WEBHOOK_URL environment variable not set, using default URL. " +
    "Please set N8N_WEBHOOK_URL in your .env.local file."
  );
}

export type LeadData = {
  leadId: string;
  to: string;
  subject: string;
  body: string;
  leadData: {
    vorname: string;
    nachname: string;
    firma: string;
    telefon: string;
    email: string;
    event_name: string;
    datum: string;
  };
};

export type N8NPayload = {
  templateId: string;
  templateName: string;
  userId: string;
  emails: LeadData[];
};

export async function sendToN8N(payload: N8NPayload): Promise<void> {
  const payloadJson = JSON.stringify(payload);
  
  console.log("Sending to n8n:", {
    url: N8N_WEBHOOK_URL,
    method: "POST",
    payloadSize: payloadJson.length,
    emailCount: payload.emails.length,
    templateId: payload.templateId,
    templateName: payload.templateName,
    payloadPreview: payloadJson.substring(0, 500),
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Seitenheld/1.0",
      },
      body: payloadJson,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let responseText = "";
    try {
      responseText = await response.text();
    } catch (e) {
      console.warn("Could not read response text:", e);
    }

    if (!response.ok) {
      let errorMessage = `n8n webhook error: ${response.status} ${response.statusText}`;
      
      // Parse error response if possible
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
        if (errorJson.hint) {
          errorMessage += `\n\nHinweis: ${errorJson.hint}`;
        }
      } catch {
        // If not JSON, use text as is
        if (responseText) {
          errorMessage += ` - ${responseText.substring(0, 200)}`;
        }
      }

      console.error("n8n webhook error:", {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText.substring(0, 500),
        url: N8N_WEBHOOK_URL,
      });

      throw new Error(errorMessage);
    }

    console.log("n8n webhook success:", {
      status: response.status,
      responseText: responseText.substring(0, 200),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("n8n webhook timeout after 30s");
      throw new Error("n8n webhook timeout: Die Anfrage dauerte zu lange (>30s)");
    }
    console.error("n8n fetch error:", {
      error: error instanceof Error ? error.message : String(error),
      url: N8N_WEBHOOK_URL,
    });
    throw error;
  }
}
