import { NextResponse } from "next/server";

const N8N_WEBHOOK_URL =
  "https://seitenheld.app.n8n.cloud/webhook-test/800af2a6-550c-48ab-8711-87d164792b69";

export async function GET() {
  try {
    const testPayload = {
      test: true,
      message: "Hello from Seitenheld",
      timestamp: new Date().toISOString(),
    };

    console.log("Testing n8n webhook (simple):", {
      url: N8N_WEBHOOK_URL,
      method: "POST",
      payload: testPayload,
    });

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log("n8n response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseData,
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          response: responseData,
          hint: "Prüfe die n8n Webhook-Konfiguration. Stelle sicher, dass POST aktiviert ist.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Test erfolgreich an n8n gesendet",
      response: responseData,
    });
  } catch (error) {
    console.error("n8n test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
