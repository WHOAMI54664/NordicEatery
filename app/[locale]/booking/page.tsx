"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function BookingPage() {
  const t = useTranslations("pages.booking");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedBookingType, setSelectedBookingType] = useState("");

  const bookingTypes = [
    "breakfast",
    "brunch",
    "lunch",
    "dinner",
    "conference",
    "other",
  ].map((type) => ({
    value: type,
    title: t(`bookingTypes.${type}.title`),
    description: t(`bookingTypes.${type}.description`),
  }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const guests = Number(formData.get("guests"));

    if (guests < 10) {
      alert(t("guestsMinimumError"));
      return;
    }

    const response = await fetch("/api/booking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
            bookingType: selectedBookingType,
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        date: formData.get("date"),
        time: formData.get("time"),
        guests,
        eventDetails: formData.get("eventDetails"),
        message: formData.get("message"),
        consent: formData.get("consent") === "on",
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

            <p className="mt-4 text-dark/60">{t("successText")}</p>
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

            <p className="mt-5 text-lg text-dark/60">{t("subtitle")}</p>
          </div>

          <form
              onSubmit={handleSubmit}
              className="mx-auto grid max-w-3xl gap-5 rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur"
          >
            <div>
              <label className="mb-3 block text-sm font-bold text-dark">
                {t("bookingType")}
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                {bookingTypes.map((type) => (
                    <label
                        key={type.value}
                        className="group cursor-pointer rounded-3xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-paprika hover:shadow-lg has-[:checked]:border-paprika has-[:checked]:bg-paprika/5 has-[:checked]:shadow-lg"
                    >
                      <input
                          required
                          type="radio"
                          name="bookingType"
                          value={type.value}
                          checked={selectedBookingType === type.value}
                          onChange={() => setSelectedBookingType(type.value)}
                          className="sr-only"
                      />

                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black/20 transition group-hover:border-paprika group-has-[:checked]:border-paprika">
                          <div className="h-2.5 w-2.5 rounded-full bg-paprika opacity-0 transition group-has-[:checked]:opacity-100" />
                        </div>

                        <div>
                          <p className="text-base font-black text-dark">
                            {type.title}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-dark/55">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </label>
                ))}
              </div>
            </div>

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

            <div className="grid gap-5 md:grid-cols-2">
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

              <div>
                <label className="mb-2 block text-sm font-bold text-dark">
                  {t("email")}
                </label>
                <input
                    required
                    name="email"
                    type="email"
                    placeholder="name@email.com"
                    className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
                />
              </div>
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
                    min="10"
                    placeholder="10"
                    className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
                />
                <p className="mt-1 text-xs text-dark/50">
                  {t("guestsNote")}
                </p>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-dark">
                {t("eventDetails")}
              </label>
              <textarea
                  name="eventDetails"
                  rows={4}
                  placeholder={t("eventDetailsPlaceholder")}
                  className="w-full resize-none rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
              />
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

            <label className="flex items-start gap-3 text-sm font-medium text-dark/70">
              <input
                  required
                  name="consent"
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-paprika"
              />
              <span>{t("consent")}</span>
            </label>

            <button type="submit" className="btn-primary mt-2">
              {t("button")}
            </button>
          </form>
        </div>
      </main>
  );
}
