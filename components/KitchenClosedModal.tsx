"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Bell,
    BellRing,
    CheckCircle2,
    Clock,
    Mail,
    Phone,
    Store,
    X,
} from "lucide-react";

type KitchenClosedModalProps = {
    locale: string;
    isOpenInitially: boolean;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

function getTodayKey(locale: string) {
    const today = new Date().toISOString().slice(0, 10);

    return `nordic-eatery-closed-modal-${locale}-${today}`;
}

function getText(locale: string) {
    if (locale === "sv") {
        return {
            eyebrow: "Köket är stängt",
            title: "Vi tar inte emot beställningar just nu",
            description:
                "Köket är stängt idag eller så har personalen inte öppnat skiftet ännu. Du kan lämna din email eller telefon så meddelar vi dig när vi öppnar.",
            notifyTitle: "Meddela mig när ni öppnar",
            email: "Email",
            phone: "Telefon",
            emailPlaceholder: "your@email.com",
            phonePlaceholder: "073...",
            submit: "Meddela mig",
            loading: "Sparar...",
            success: "Klart! Vi meddelar dig när köket öppnar.",
            error: "Kunde inte spara. Försök igen.",
            close: "Jag förstår",
            later: "Kanske senare",
            today: "Beställningar är pausade tills skiftet öppnas.",
        };
    }

    if (locale === "pl") {
        return {
            eyebrow: "Kuchnia zamknięta",
            title: "Nie przyjmujemy teraz zamówień",
            description:
                "Kuchnia jest dziś zamknięta albo zmiana nie została jeszcze otwarta. Zostaw email lub telefon, a powiadomimy Cię, gdy otworzymy.",
            notifyTitle: "Powiadom mnie, gdy otworzycie",
            email: "Email",
            phone: "Telefon",
            emailPlaceholder: "your@email.com",
            phonePlaceholder: "073...",
            submit: "Powiadom mnie",
            loading: "Zapisywanie...",
            success: "Gotowe! Powiadomimy Cię, gdy kuchnia się otworzy.",
            error: "Nie udało się zapisać. Spróbuj ponownie.",
            close: "Rozumiem",
            later: "Może później",
            today: "Zamówienia są wstrzymane do otwarcia zmiany.",
        };
    }

    if (locale === "ru") {
        return {
            eyebrow: "Кухня закрыта",
            title: "Мы сейчас не принимаем заказы",
            description:
                "Сегодня кухня закрыта или смена ещё не открыта персоналом. Оставьте email или телефон — мы сможем уведомить вас, когда откроемся.",
            notifyTitle: "Уведомить меня, когда откроетесь",
            email: "Email",
            phone: "Телефон",
            emailPlaceholder: "your@email.com",
            phonePlaceholder: "073...",
            submit: "Уведомить меня",
            loading: "Сохраняем...",
            success: "Готово! Мы уведомим вас, когда кухня откроется.",
            error: "Не удалось сохранить. Попробуйте ещё раз.",
            close: "Понятно",
            later: "Может позже",
            today: "Заказы приостановлены до открытия смены.",
        };
    }

    return {
        eyebrow: "Kitchen closed",
        title: "We are not accepting orders right now",
        description:
            "The kitchen is closed today or the staff has not opened the shift yet. Leave your email or phone and we can notify you when we open.",
        notifyTitle: "Notify me when you open",
        email: "Email",
        phone: "Phone",
        emailPlaceholder: "your@email.com",
        phonePlaceholder: "073...",
        submit: "Notify me",
        loading: "Saving...",
        success: "Done! We will notify you when the kitchen opens.",
        error: "Could not save. Please try again.",
        close: "I understand",
        later: "Maybe later",
        today: "Orders are paused until the shift opens.",
    };
}

export function KitchenClosedModal({
                                       locale,
                                       isOpenInitially,
                                   }: KitchenClosedModalProps) {
    const text = useMemo(() => getText(locale), [locale]);

    const [isOpen, setIsOpen] = useState(false);
    const [showNotifyForm, setShowNotifyForm] = useState(false);

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");

    const [status, setStatus] = useState<SubmitStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpenInitially) return;

        const storageKey = getTodayKey(locale);
        const alreadyClosedToday = window.sessionStorage.getItem(storageKey);

        if (!alreadyClosedToday) {
            setIsOpen(true);
            window.sessionStorage.setItem(storageKey, "shown");
        }
    }, [isOpenInitially, locale]);

    function closeModal() {
        setIsOpen(false);
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        if (!cleanEmail && !cleanPhone) {
            setErrorMessage("Please enter email or phone.");
            setStatus("error");
            return;
        }

        setStatus("loading");
        setErrorMessage(null);

        try {
            const response = await fetch("/api/shift-open-notifications", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: cleanEmail || null,
                    phone: cleanPhone || null,
                    locale,
                    source: "menu_closed_modal",
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus("error");
                setErrorMessage(data.error || text.error);
                return;
            }

            setStatus("success");
            setEmail("");
            setPhone("");
        } catch (error) {
            console.error("Shift notify form error:", error);
            setStatus("error");
            setErrorMessage(text.error);
        }
    }

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-dark/45 px-4 py-6 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-cream shadow-2xl shadow-dark/20">
                <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.22),transparent_40%),radial-gradient(circle_at_top_right,rgba(224,161,43,0.25),transparent_40%)]" />

                <button
                    type="button"
                    onClick={closeModal}
                    className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-dark shadow-sm transition hover:bg-white hover:text-paprika"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="relative p-6 sm:p-8">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-paprika/10 text-paprika">
                        <Store className="h-8 w-8" />
                    </div>

                    <p className="mt-6 text-xs font-black uppercase tracking-[0.22em] text-paprika">
                        {text.eyebrow}
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-dark sm:text-4xl">
                        {text.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-dark/60">
                        {text.description}
                    </p>

                    <div className="mt-5 flex items-start gap-3 rounded-3xl border border-dark/10 bg-white/70 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-honey/15 text-honey">
                            <Clock className="h-5 w-5" />
                        </div>

                        <div>
                            <p className="font-black text-dark">{text.today}</p>
                            <p className="mt-1 text-sm leading-6 text-dark/50">
                                Nordic Eatery · Boden
                            </p>
                        </div>
                    </div>

                    {!showNotifyForm && status !== "success" ? (
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setShowNotifyForm(true)}
                                className="btn-primary flex items-center justify-center gap-2"
                            >
                                <BellRing className="h-5 w-5" />
                                {text.notifyTitle}
                            </button>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="btn-secondary flex items-center justify-center gap-2"
                            >
                                {text.close}
                            </button>
                        </div>
                    ) : null}

                    {showNotifyForm && status !== "success" ? (
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="rounded-3xl border border-dark/10 bg-white/70 p-4">
                                <div className="mb-4 flex items-center gap-2 font-black text-dark">
                                    <Bell className="h-5 w-5 text-paprika" />
                                    {text.notifyTitle}
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label>
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-dark/70">
                      <Mail className="h-4 w-4 text-paprika" />
                        {text.email}
                    </span>

                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder={text.emailPlaceholder}
                                            className="input-field"
                                        />
                                    </label>

                                    <label>
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-dark/70">
                      <Phone className="h-4 w-4 text-paprika" />
                        {text.phone}
                    </span>

                                        <input
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            placeholder={text.phonePlaceholder}
                                            className="input-field"
                                        />
                                    </label>
                                </div>
                            </div>

                            {status === "error" ? (
                                <div className="rounded-2xl border border-paprika/15 bg-paprika/10 p-3 text-sm font-bold text-paprika">
                                    {errorMessage || text.error}
                                </div>
                            ) : null}

                            <div className="grid gap-3 sm:grid-cols-2">
                                <button
                                    type="submit"
                                    disabled={status === "loading"}
                                    className="btn-primary flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <Clock className="h-5 w-5 animate-spin" />
                                            {text.loading}
                                        </>
                                    ) : (
                                        <>
                                            <BellRing className="h-5 w-5" />
                                            {text.submit}
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn-secondary"
                                >
                                    {text.later}
                                </button>
                            </div>
                        </form>
                    ) : null}

                    {status === "success" ? (
                        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />

                                <div>
                                    <p className="font-black">{text.success}</p>

                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                                    >
                                        {text.close}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}