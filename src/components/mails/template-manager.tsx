"use client";

import { useState, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const MAX_TEMPLATES = 10;

// Statisches Beispiel-Datum um Hydration-Fehler zu vermeiden
const STATIC_EXAMPLE_DATE = "15.01.2025";

const exampleData = {
  vorname: "Max",
  nachname: "Mustermann",
  email: "max@example.com",
  telefon: "+49 151 23456789",
  firma: "Muster GmbH",
  event_name: "Tech Expo 2025",
  datum: STATIC_EXAMPLE_DATE,
};

function renderTemplate(template: string, data: typeof exampleData = exampleData) {
  return template
    .replace(/{{\s*vorname\s*}}/gi, data.vorname)
    .replace(/{{\s*nachname\s*}}/gi, data.nachname)
    .replace(/{{\s*email\s*}}/gi, data.email)
    .replace(/{{\s*telefon\s*}}/gi, data.telefon)
    .replace(/{{\s*firma\s*}}/gi, data.firma)
    .replace(/{{\s*event_name\s*}}/gi, data.event_name)
    .replace(/{{\s*datum\s*}}/gi, data.datum);
}

type Template = {
  id: string;
  name: string;
  subject: string;
  template: string;
  created_at: string;
  updated_at: string;
};

type TemplateManagerProps = {
  initialTemplates: Template[];
};

export function TemplateManager({ initialTemplates }: TemplateManagerProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    template: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const textareaId = useId();
  const subjectId = useId();

  const canCreateMore = templates.length < MAX_TEMPLATES;

  const handleInsert = (variable: string, isSubject = false) => {
    const id = isSubject ? subjectId : textareaId;
    const element = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!element) {
      if (isSubject) {
        setFormData((prev) => ({ ...prev, subject: prev.subject + " " + variable }));
      } else {
        setFormData((prev) => ({ ...prev, template: prev.template + " " + variable }));
      }
      return;
    }
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const value = element.value;
    const next = value.slice(0, start) + variable + value.slice(end);
    if (isSubject) {
      setFormData((prev) => ({ ...prev, subject: next }));
    } else {
      setFormData((prev) => ({ ...prev, template: next }));
    }
    setTimeout(() => {
      element.focus();
      element.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.template.trim()) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }

    setIsSaving(true);
    try {
      const url = editingTemplate
        ? "/api/mails/templates"
        : "/api/mails/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const body = editingTemplate
        ? { id: editingTemplate.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Fehler beim Speichern");
      }

      toast.success(editingTemplate ? "Template aktualisiert" : "Template erstellt");
      router.refresh();
      setEditingTemplate(null);
      setIsCreating(false);
      setFormData({ name: "", subject: "", template: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/mails/templates?id=${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Löschen");
      }

      toast.success("Template gelöscht");
      router.refresh();
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      template: template.template,
    });
    setIsCreating(true);
  };

  const handleCancel = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setFormData({ name: "", subject: "", template: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates verwalten</h2>
          <p className="text-sm text-muted-foreground">
            {templates.length}/{MAX_TEMPLATES} Templates erstellt
          </p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingTemplate(null);
            setFormData({ name: "", subject: "", template: "" });
          }}
          disabled={!canCreateMore}
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Neues Template
        </Button>
      </div>

      {isCreating && (
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>
              {editingTemplate ? "Template bearbeiten" : "Neues Template erstellen"}
            </CardTitle>
            <CardDescription>
              Erstelle ein Template mit Betreff und E-Mail-Text. Nutze Platzhalter
              für die Personalisierung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template-Name</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="z.B. Follow-up nach Messe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={subjectId}>Betreff</Label>
              <Input
                id={subjectId}
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="z.B. Follow-up nach {{event_name}}"
                className="font-mono text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{event_name}}", true)}
                >
                  Event-Name
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{vorname}}", true)}
                >
                  Vorname
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={textareaId}>E-Mail-Vorlage</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{vorname}}")}
                >
                  Vorname
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{nachname}}")}
                >
                  Nachname
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{email}}")}
                >
                  E-Mail
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{telefon}}")}
                >
                  Telefon
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{firma}}")}
                >
                  Firma
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{event_name}}")}
                >
                  Event-Name
                </Badge>
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => handleInsert("{{datum}}")}
                >
                  Datum
                </Badge>
              </div>
              <Textarea
                id={textareaId}
                value={formData.template}
                onChange={(e) =>
                  setFormData({ ...formData, template: e.target.value })
                }
                rows={10}
                className="font-mono text-sm"
                placeholder="Hi {{vorname}},&#10;&#10;vielen Dank für das Gespräch..."
              />
            </div>

            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">Vorschau</p>
              <div className="space-y-2">
                <div className="rounded-md bg-white p-2 text-xs font-medium border-b">
                  Betreff: {renderTemplate(formData.subject || "Betreff", exampleData)}
                </div>
                <div className="rounded-md bg-white p-3 text-sm leading-relaxed shadow-sm whitespace-pre-wrap">
                  {renderTemplate(formData.template || "Vorlage", exampleData)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? "Speichern..." : "Speichern"}
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                Abbrechen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <CardDescription className="line-clamp-1">
                {template.subject}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.template}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(template)}
                  className="flex-1"
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  Bearbeiten
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Template löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Möchtest du dieses Template wirklich löschen? Diese Aktion
                        kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(template.id)}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && !isCreating && (
        <Card className="border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              Noch keine Templates erstellt
            </p>
            <Button onClick={() => setIsCreating(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Erstes Template erstellen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
