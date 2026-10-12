"use client";
import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { useEditableTranslations } from "./site-content/EditableMessage";

export function ReceiptActions({
  downloadUrl,
  emailUrl,
  emailBody = {},
  initialEmail = "",
}: {
  downloadUrl: string;
  emailUrl: string;
  emailBody?: Record<string, string>;
  initialEmail?: string;
}) {
  const t = useEditableTranslations("receipt");
  const [email, setEmail] = useState(initialEmail);
  const [showEmail, setShowEmail] = useState(false);
  const [busy, setBusy] = useState<"download" | "email" | null>(null);
  const [message, setMessage] = useState("");
  async function download() {
    setBusy("download");
    setMessage("");
    try {
      const response = await fetch(downloadUrl, {
        cache: "no-store",
        referrerPolicy: "no-referrer",
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.includes("application/pdf")
      )
        throw new Error("receipt");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename = response.headers
        .get("content-disposition")
        ?.match(/filename="([a-zA-Z0-9_.-]+)"/)?.[1];
      link.download = filename || "nordic-eatery-kvitto.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setMessage(t("error"));
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void download()}
          disabled={!!busy}
          className="btn-primary gap-2 disabled:opacity-50"
        >
          <Download size={18} />
          {t.edit("download")}
        </button>
        <button
          type="button"
          onClick={() => setShowEmail(!showEmail)}
          aria-expanded={showEmail}
          className="btn-secondary gap-2"
        >
          <Mail size={18} />
          {t.edit("email")}
        </button>
      </div>
      {showEmail && (
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy("email");
            setMessage("");
            try {
              const response = await fetch(emailUrl, {
                method: "POST",
                referrerPolicy: "no-referrer",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...emailBody, email }),
              });
              const body = await response.json();
              if (!response.ok) {
                setMessage(
                  t(
                    body.error === "emailUnavailable"
                      ? "emailUnavailable"
                      : "emailError",
                  ),
                );
                return;
              }
              setMessage(t("sent"));
            } catch {
              setMessage(t("emailError"));
            } finally {
              setBusy(null);
            }
          }}
        >
          <label className="block text-sm font-semibold">
            {t.edit("emailLabel")}
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-field mt-2"
            />
          </label>
          <button
            disabled={!!busy}
            className="btn-primary w-full disabled:opacity-50"
          >
            {t.edit(busy === "email" ? "sending" : "send")}
          </button>
        </form>
      )}
      {message && (
        <p role="status" className="text-sm text-dark/70">
          {message}
        </p>
      )}
    </div>
  );
}
