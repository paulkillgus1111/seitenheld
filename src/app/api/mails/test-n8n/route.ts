import { NextResponse } from "next/server";
import { sendToN8N } from "@/lib/n8n";

export async function GET() {
  try {
    const testPayload = {
      templateId: "test-template-id",
      templateName: "Test Template",
      userId: "test-user-id",
      emails: [
        {
          leadId: "test-lead-id",
          to: "test@example.com",
          subject: "Test Betreff",
          body: "Test Body",
          leadData: {
            vorname: "Max",
            nachname: "Mustermann",
            firma: "Test GmbH",
            telefon: "+49 123 456789",
            email: "test@example.com",
            event_name: "Test Event",
            datum: new Date().toLocaleDateString("de-DE"),
          },
        },
      ],
    };

    console.log("Testing n8n webhook with payload:", JSON.stringify(testPayload, null, 2));

    await sendToN8N(testPayload);

    return NextResponse.json({
      success: true,
      message: "Test erfolgreich an n8n gesendet",
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
