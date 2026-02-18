"use client";

import { useEffect } from "react";

export function PasswordResetRedirect() {
  useEffect(() => {
    // Prüfe SOFORT, ob Hash-Parameter mit type=recovery vorhanden sind
    // Supabase sendet manchmal Reset-Links zur Root-URL mit Hash-Parametern
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    const accessToken = hashParams.get("access_token");

    // Wenn Recovery-Token in der Root-URL, SOFORT weiterleiten zur Reset-Password-Seite
    if (type === "recovery" && accessToken) {
      // Behalte Hash-Parameter bei der Weiterleitung
      // Verwende window.location.replace für sofortige Weiterleitung ohne React Router
      // Das verhindert, dass die Landing Page weiterleitet
      window.location.replace(`/auth/reset-password${window.location.hash}`);
    }
  }, []);

  return null; // Diese Komponente rendert nichts
}
