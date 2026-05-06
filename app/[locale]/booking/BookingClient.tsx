"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EditableText } from "@/components/EditableText";

type BookingClientProps = {
    locale: string;
    canEdit: boolean;
    editableContent: Record<string, string>;
};

export default function BookingClient({
                                          locale,
                                          canEdit,
                                          editableContent,
                                      }: BookingClientProps) {
    const t = useTranslations("pages.booking");

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reservationNumber, setReservationNumber] = useState<string | null>(
        null
    );

    const [selectedBookingService, setSelectedBookingService] = useState("");
    const [selectedBookingType, setSelectedBookingType] = useState("");

    function text(key: string, fallbackKey: string) {
        return editableContent[key] || t(fallbackKey);
    }

    const bookingServices = ["table", "catering", "foodTruck"].map((service) => ({
        value: service,
        titleKey: `booking.bookingServices.${service}.title`,
        descriptionKey: `booking.bookingServices.${service}.description`,
        title: text(
            `booking.bookingServices.${service}.title`,
            `bookingServices.${service}.title`
        ),
        description: text(
            `booking.bookingServices.${service}.description`,
            `bookingServices.${service}.description`
        ),
    }));

    const bookingTypes = [
        "breakfast",
        "brunch",
        "lunch",
        "dinner",
        "conference",
        "other",
    ].map((type) => ({
        value: type,
        titleKey: `booking.bookingTypes.${type}.title`,
        descriptionKey: `booking.bookingTypes.${type}.description`,
        title: text(
            `booking.bookingTypes.${type}.title`,
            `bookingTypes.${type}.title`
        ),
        description: text(
            `booking.bookingTypes.${type}.description`,
            `bookingTypes.${type}.description`
        ),
    }));

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSubmitting) return;

        const form = event.currentTarget;
        const formData = new FormData(form);

        const guests = Number(formData.get("guests"));
        const minimumGuests = selectedBookingService === "table" ? 2 : 10;

        if (!selectedBookingService) {
            alert(t("bookingServiceError"));
            return;
        }

        if (!selectedBookingType) {
            alert(t("bookingTypeError"));
            return;
        }

        if (Number.isNaN(guests) || guests < minimumGuests) {
            alert(
                selectedBookingService === "table"
                    ? t("tableGuestsMinimumError")
                    : t("guestsMinimumError")
            );
            return;
        }

        try {
            setIsSubmitting(true);

            const response = await fetch("/api/booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    locale,
                    bookingService: selectedBookingService,
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

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                console.error("Booking error:", data);
                alert(data?.error || t("error"));
                return;
            }

            setReservationNumber(data?.reservationNumber || null);
            setIsSubmitted(true);

            form.reset();
            setSelectedBookingService("");
            setSelectedBookingType("");
        } catch (error) {
            console.error("Booking submit error:", error);
            alert(t("error"));
        } finally {
            setIsSubmitting(false);
        }
    }

    if (isSubmitted) {
        return (
            <main className="min-h-screen px-6 py-24">
                <div className="mx-auto max-w-3xl rounded-3xl bg-white/80 p-10 text-center shadow-xl backdrop-blur">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
                        <EditableText
                            value={text("booking.successEyebrow", "successEyebrow")}
                            textKey="booking.successEyebrow"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </p>

                    <h1 className="mt-4 text-4xl font-black text-dark">
                        <EditableText
                            value={text("booking.successTitle", "successTitle")}
                            textKey="booking.successTitle"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </h1>

                    <p className="mt-4 text-dark/60">
                        <EditableText
                            value={text("booking.successText", "successText")}
                            textKey="booking.successText"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </p>

                    {reservationNumber && (
                        <div className="mx-auto mt-6 inline-flex rounded-full bg-paprika/10 px-5 py-3 text-sm font-black text-paprika">
                            {reservationNumber}
                        </div>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen px-6 py-24">
            <div className="mx-auto max-w-5xl">
                <div className="mb-12 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.3em] text-paprika">
                        <EditableText
                            value={text("booking.eyebrow", "eyebrow")}
                            textKey="booking.eyebrow"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </p>

                    <h1 className="mt-4 text-5xl font-black text-dark">
                        <EditableText
                            value={text("booking.title", "title")}
                            textKey="booking.title"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </h1>

                    <p className="mt-5 text-lg text-dark/60">
                        <EditableText
                            value={text("booking.subtitle", "subtitle")}
                            textKey="booking.subtitle"
                            locale={locale}
                            page="booking"
                            canEdit={canEdit}
                            as="span"
                        />
                    </p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mx-auto grid max-w-3xl gap-7 rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur"
                >
                    <div>
                        <label className="mb-3 block text-sm font-bold text-dark">
                            <EditableText
                                value={text("booking.bookingService", "bookingService")}
                                textKey="booking.bookingService"
                                locale={locale}
                                page="booking"
                                canEdit={canEdit}
                                as="span"
                            />
                        </label>

                        <div className="grid gap-4 md:grid-cols-3">
                            {bookingServices.map((service) => (
                                <label
                                    key={service.value}
                                    className="group cursor-pointer rounded-3xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-paprika hover:shadow-lg has-[:checked]:border-paprika has-[:checked]:bg-paprika/5 has-[:checked]:shadow-lg"
                                >
                                    <input
                                        required
                                        type="radio"
                                        name="bookingService"
                                        value={service.value}
                                        checked={selectedBookingService === service.value}
                                        onChange={() => setSelectedBookingService(service.value)}
                                        className="sr-only"
                                    />

                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black/20 transition group-hover:border-paprika group-has-[:checked]:border-paprika">
                                            <div className="h-2.5 w-2.5 rounded-full bg-paprika opacity-0 transition group-has-[:checked]:opacity-100" />
                                        </div>

                                        <div>
                                            <p className="text-base font-black text-dark">
                                                <EditableText
                                                    value={service.title}
                                                    textKey={service.titleKey}
                                                    locale={locale}
                                                    page="booking"
                                                    canEdit={canEdit}
                                                    as="span"
                                                />
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-dark/55">
                                                <EditableText
                                                    value={service.description}
                                                    textKey={service.descriptionKey}
                                                    locale={locale}
                                                    page="booking"
                                                    canEdit={canEdit}
                                                    as="span"
                                                />
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-3 block text-sm font-bold text-dark">
                            <EditableText
                                value={text("booking.bookingType", "bookingType")}
                                textKey="booking.bookingType"
                                locale={locale}
                                page="booking"
                                canEdit={canEdit}
                                as="span"
                            />
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
                                                <EditableText
                                                    value={type.title}
                                                    textKey={type.titleKey}
                                                    locale={locale}
                                                    page="booking"
                                                    canEdit={canEdit}
                                                    as="span"
                                                />
                                            </p>

                                            <p className="mt-1 text-sm leading-6 text-dark/55">
                                                <EditableText
                                                    value={type.description}
                                                    textKey={type.descriptionKey}
                                                    locale={locale}
                                                    page="booking"
                                                    canEdit={canEdit}
                                                    as="span"
                                                />
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-dark">
                            <EditableText
                                value={text("booking.name", "name")}
                                textKey="booking.name"
                                locale={locale}
                                page="booking"
                                canEdit={canEdit}
                                as="span"
                            />
                        </label>

                        <input
                            required
                            name="name"
                            type="text"
                            placeholder={text("booking.namePlaceholder", "namePlaceholder")}
                            className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-dark">
                                <EditableText
                                    value={text("booking.phone", "phone")}
                                    textKey="booking.phone"
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
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
                                <EditableText
                                    value={text("booking.email", "email")}
                                    textKey="booking.email"
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
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
                                <EditableText
                                    value={text("booking.date", "date")}
                                    textKey="booking.date"
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
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
                                <EditableText
                                    value={text("booking.time", "time")}
                                    textKey="booking.time"
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
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
                                <EditableText
                                    value={text("booking.guests", "guests")}
                                    textKey="booking.guests"
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
                            </label>

                            <input
                                required
                                name="guests"
                                type="number"
                                min={selectedBookingService === "table" ? 2 : 10}
                                placeholder={selectedBookingService === "table" ? "2" : "10"}
                                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
                            />

                            <p className="mt-1 text-xs text-dark/50">
                                <EditableText
                                    value={
                                        selectedBookingService === "table"
                                            ? text("booking.tableGuestsNote", "tableGuestsNote")
                                            : text("booking.guestsNote", "guestsNote")
                                    }
                                    textKey={
                                        selectedBookingService === "table"
                                            ? "booking.tableGuestsNote"
                                            : "booking.guestsNote"
                                    }
                                    locale={locale}
                                    page="booking"
                                    canEdit={canEdit}
                                    as="span"
                                />
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-dark">
                            <EditableText
                                value={text("booking.eventDetails", "eventDetails")}
                                textKey="booking.eventDetails"
                                locale={locale}
                                page="booking"
                                canEdit={canEdit}
                                as="span"
                            />
                        </label>

                        <textarea
                            name="eventDetails"
                            rows={4}
                            placeholder={text(
                                "booking.eventDetailsPlaceholder",
                                "eventDetailsPlaceholder"
                            )}
                            className="w-full resize-none rounded-2xl border border-black/10 bg-white px-5 py-4 outline-none transition focus:border-paprika"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-bold text-dark">
                            <EditableText
                                value={text("booking.message", "message")}
                                textKey="booking.message"
                                locale={locale}
                                page="booking"
                                canEdit={canEdit}
                                as="span"
                            />
                        </label>

                        <textarea
                            name="message"
                            rows={4}
                            placeholder={text(
                                "booking.messagePlaceholder",
                                "messagePlaceholder"
                            )}
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

                        <span>
              <EditableText
                  value={text("booking.consent", "consent")}
                  textKey="booking.consent"
                  locale={locale}
                  page="booking"
                  canEdit={canEdit}
                  as="span"
              />
            </span>
                    </label>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary mt-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting
                            ? text("booking.sending", "sending")
                            : text("booking.button", "button")}
                    </button>
                </form>
            </div>
        </main>
    );
}