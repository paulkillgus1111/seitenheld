"use client";

import { Button } from "@/components/ui/button";

export function TemplateDownloadButton() {
  const handleClick = () => {
    const header =
      "First Name,Last Name,Company,Email,Phone,Summary,Event Name\n";
    const example =
      "Max,Mustermann,Muster GmbH,max@example.com,+49 151 23456789,\"Interessiert an Demo.\",Tech Expo 2025\n";
    const blob = new Blob([header + example], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "seitenheld-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleClick}>
      CSV-Vorlage herunterladen
    </Button>
  );
}

