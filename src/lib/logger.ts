/**
 * Maskiert sensitive Daten in Logs
 */
function maskSensitiveData(data: any): any {
  if (!data || typeof data !== "object") return data;

  const masked = { ...data };

  // Maskiere Telefonnummern
  if (masked.phone_number) {
    masked.phone_number = masked.phone_number.replace(
      /(\+\d{2})\d+(\d{4})/,
      "$1****$2"
    );
  }

  // Maskiere E-Mail (nur Domain zeigen)
  if (masked.email) {
    const [local, domain] = masked.email.split("@");
    if (local && domain) {
      masked.email = `${local.substring(0, 2)}***@${domain}`;
    }
  }

  // Rekursiv für verschachtelte Objekte
  Object.keys(masked).forEach((key) => {
    if (typeof masked[key] === "object" && masked[key] !== null && !Array.isArray(masked[key])) {
      masked[key] = maskSensitiveData(masked[key]);
    }
    // Arrays behandeln
    if (Array.isArray(masked[key])) {
      masked[key] = masked[key].map((item: any) =>
        typeof item === "object" && item !== null
          ? maskSensitiveData(item)
          : item
      );
    }
  });

  return masked;
}

/**
 * Logger - nur in Development loggen, sensitive Daten maskieren
 */
export const logger = {
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.log(message, data ? maskSensitiveData(data) : undefined);
    }
  },
  error: (message: string, error?: any) => {
    // Errors immer loggen (auch in Production) - aber sensitive Daten maskieren
    if (error && typeof error === "object") {
      console.error(message, maskSensitiveData(error));
    } else {
      console.error(message, error);
    }
  },
  warn: (message: string, data?: any) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(message, data ? maskSensitiveData(data) : undefined);
    }
  },
};
