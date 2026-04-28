"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function BookingPage() {
  const t = useTranslations("pages.booking");
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: formData.get("name"),
        phone: formData.get("phone"),
        date: formData.get("date"),
        time: formData.get("time"),
        guests: formData.get("guests"),
        message: formData.get("message"),
      }),
    });

    if (!response.ok) {
      alert(t("error"));
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
            {t("successEyebrow")}
          </p>

          <h1 className="mt-4 text-4xl font-black text-dark">
            {t("successTitle")}
          </h1>

          <p className="mt-4 text-dark/60">
            {t("successText")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
            {t("eyebrow")}
          </p>

          <h1 className="mt-4 text-5xl font-black text-dark">
            {t("title")}
          </h1>

          <p className="mt-5 text-lg text-dark/60">
            {t("subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-3xl gap-5 rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur"
        >
          <div>
            <label className="mb-2 block text-sm font-bold text-dark">
              {t("name")}
            </label>
            <input
              required
              name="name"
              type="text"
              placeholder={t("namePlaceholder")}
              className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-dark">
              {t("phone")}
            </label>
            <input
              required
              name="phone"
              type="tel"
              placeholder="+46 ..."
              className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-bold text-dark">
                {t("date")}
              </label>
              <input
                required
                name="date"
                type="date"
                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-dark">
                {t("time")}
              </label>
              <input
                required
                name="time"
                type="time"
                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-dark">
                {t("guests")}
              </label>
              <input
                required
                name="guests"
                type="number"
                min="1"
                placeholder="2"
                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-dark">
              {t("message")}
            </label>
            <textarea
              name="message"
              rows={4}
              placeholder={t("messagePlaceholder")}
              className="w-full resize-none rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
            />
          </div>

          <button type="submit" className="btn-primary mt-2">
            {t("button")}
          </button>
        </form>
      </div>
    </main>
  );
}