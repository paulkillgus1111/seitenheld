import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

const MAX_TEMPLATES = 10;

const templateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  subject: z.string().min(1, "Betreff ist erforderlich").max(200),
  template: z.string().min(1, "Template ist erforderlich").max(50000),
});

const updateTemplateSchema = templateSchema.extend({
  id: z.string().uuid(),
});

// GET: Alle Templates des Users abrufen
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: templates, error } = await supabase
      .from("mail_templates")
      .select("id, name, subject, template, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Neues Template erstellen
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prüfe ob bereits 10 Templates existieren
    const { count } = await supabase
      .from("mail_templates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count && count >= MAX_TEMPLATES) {
      return NextResponse.json(
        { error: `Maximal ${MAX_TEMPLATES} Templates erlaubt` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validated = templateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { data: template, error } = await ((supabase
      .from("mail_templates") as any)
      .insert({
        user_id: user.id,
        name: validated.data.name,
        subject: validated.data.subject,
        template: validated.data.template,
      })
      .select()
      .single());

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Template aktualisieren
export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateTemplateSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Prüfe ob Template dem User gehört
    const { data: existing } = await supabase
      .from("mail_templates")
      .select("id, user_id")
      .eq("id", validated.data.id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const { data: template, error } = await ((supabase
      .from("mail_templates") as any)
      .update({
        name: validated.data.name,
        subject: validated.data.subject,
        template: validated.data.template,
      })
      .eq("id", validated.data.id)
      .eq("user_id", user.id)
      .select()
      .single());

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ template });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Template löschen
export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Prüfe ob Template dem User gehört
    const { data: existing } = await supabase
      .from("mail_templates")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from("mail_templates")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
