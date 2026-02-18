"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type SettingsGeneralProps = {
  initialWorkspaceName: string;
};

export function SettingsGeneral({ initialWorkspaceName }: SettingsGeneralProps) {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [isSaving, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_name: workspaceName }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Speichern");
        }

        toast.success("Workspace-Name aktualisiert");
        router.refresh();
      } catch {
        toast.error("Fehler beim Aktualisieren");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="workspace">Workspace-Name</Label>
        <Input
          id="workspace"
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="z.B. Meine Firma GmbH"
        />
        <p className="text-xs text-muted-foreground">
          Name deines Workspaces oder deiner Firma
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
