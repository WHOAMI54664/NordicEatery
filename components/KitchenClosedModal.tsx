"use client";

import { EditableCopy } from "@/components/site-content/EditableCopy";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Mail,
  Store,
  X,
} from "lucide-react";

type KitchenClosedModalProps = {
  locale: string;
  /** Uncontrolled mode: auto-opens once per day when true (used on the menu page). */
  isOpenInitially?: boolean;
  /** Controlled mode: when provided, visibility is driven by this prop. */
  open?: boolean;
  onClose?: () => void;
};

type SubmitStatus = "idle" | "loading" | "success" | "error";

function getTodayKey(locale: string) {
  const today = new Date().toISOString().slice(0, 10);

  return `nordic-eatery-closed-modal-${locale}-${today}`;
}

function getText(locale: string) {
  if (locale === "sv") {
    return {
      title: "Köket är stängt just nu",
      description: "Hungrig? Vi säger till när köket öppnar!",
      notifyTitle: "Ja, meddela mig!",
      email: "Email",
      marketing:
        "Jag vill också få nyheter och erbjudanden från Nordic Eatery via e-post. Jag kan avsluta prenumerationen när som helst.",
      privacy: "Integritetspolicy",
      invalidEmail: "Ange en giltig e-postadress.",
      emailPlaceholder: "your@email.com",
      submit: "Meddela mig",
      loading: "Sparar...",
      success: "Klart! Vi meddelar dig när köket öppnar.",
      error: "Kunde inte spara. Försök igen.",
      close: "Utforska menyn",
      later: "Kanske senare",
      today: "Ta en smygtitt på menyn!",
    };
  }

  if (locale === "pl") {
    return {
      title: "Nie przyjmujemy teraz zamówień",
      description:
        "Kuchnia jest teraz zamknięta. Zostaw adres e-mail, a wyślemy jedno powiadomienie przy następnym otwarciu.",
      notifyTitle: "Powiadom mnie, gdy otworzycie",
      email: "Email",
      marketing:
        "Chcę również otrzymywać wiadomości i oferty Nordic Eatery e-mailem. Mogę zrezygnować w każdej chwili.",
      privacy: "Polityka prywatności",
      invalidEmail: "Podaj prawidłowy adres e-mail.",
      emailPlaceholder: "your@email.com",
      submit: "Powiadom mnie",
      loading: "Zapisywanie...",
      success: "Gotowe! Powiadomimy Cię, gdy kuchnia się otworzy.",
      error: "Nie udało się zapisać. Spróbuj ponownie.",
      close: "Rozumiem",
      later: "Może później",
      today: "Nadal możesz przeglądać menu.",
    };
  }

  if (locale === "ru") {
    return {
      title: "Мы сейчас не принимаем заказы",
      description:
        "Сейчас кухня закрыта. Оставьте email — мы отправим одно уведомление, когда снова откроемся.",
      notifyTitle: "Уведомить меня, когда откроетесь",
      email: "Email",
      marketing:
        "Хочу также получать новости и предложения Nordic Eatery по email. Отписаться можно в любой момент.",
      privacy: "Политика конфиденциальности",
      invalidEmail: "Введите корректный email.",
      emailPlaceholder: "your@email.com",
      submit: "Уведомить меня",
      loading: "Сохраняем...",
      success: "Готово! Мы уведомим вас, когда кухня откроется.",
      error: "Не удалось сохранить. Попробуйте ещё раз.",
      close: "Понятно",
      later: "Может позже",
      today: "Пока можно посмотреть наше меню.",
    };
  }

  return {
    title: "We are not accepting orders right now",
    description:
      "The kitchen is closed right now. Leave your email and we will send one notification the next time we open.",
    notifyTitle: "Notify me when you open",
    email: "Email",
    marketing:
      "I also want email news and offers from Nordic Eatery. I can unsubscribe at any time.",
    privacy: "Privacy policy",
    invalidEmail: "Enter a valid email address.",
    emailPlaceholder: "your@email.com",
    submit: "Notify me",
    loading: "Saving...",
    success: "Done! We will notify you when the kitchen opens.",
    error: "Could not save. Please try again.",
    close: "I understand",
    later: "Maybe later",
    today: "You can still browse our menu.",
  };
}

export function KitchenClosedModal({
  locale,
  isOpenInitially,
  open,
  onClose,
}: KitchenClosedModalProps) {
  const text = useMemo(() => getText(locale), [locale]);

  const isControlled = open !== undefined;

  const [internalOpen, setInternalOpen] = useState(false);
  const [showNotifyForm, setShowNotifyForm] = useState(false);

  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOpen = isControlled ? Boolean(open) : internalOpen;

  useEffect(() => {
    if (isControlled) return;
    if (!isOpenInitially) return;

    const storageKey = getTodayKey(locale);
    const alreadyClosedToday = window.sessionStorage.getItem(storageKey);

    if (!alreadyClosedToday) {
      setInternalOpen(true);
      window.sessionStorage.setItem(storageKey, "shown");
    }
  }, [isControlled, isOpenInitially, locale]);

  function closeModal() {
    setShowNotifyForm(false);
    setStatus("idle");
    setErrorMessage(null);

    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage(text.invalidEmail);
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
          marketingConsent,
          locale,
          source: "menu_closed_modal",
        }),
      });

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(text.error);
        return;
      }

      setStatus("success");
      setEmail("");
      setMarketingConsent(false);
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
      <div className="relative max-h-[calc(100dvh-3rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-white/70 bg-cream shadow-2xl shadow-dark/20">
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

          <h2 className="mt-6 text-3xl font-black tracking-[-0.05em] text-dark sm:text-4xl">
            <EditableCopy
              value={text.title}
              textKey="kitchenClosed.title"
              page="kitchenClosed"
            />
          </h2>

          <p className="mt-3 text-sm leading-6 text-dark/60">
            <EditableCopy
              value={text.description}
              textKey="kitchenClosed.description"
              page="kitchenClosed"
            />
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-3xl border border-dark/10 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-honey/15 text-honey">
              <Clock className="h-5 w-5" />
            </div>

            <div>
              <p className="font-black text-dark">
                <EditableCopy
                  value={text.today}
                  textKey="kitchenClosed.today"
                  page="kitchenClosed"
                />
              </p>
              <p className="mt-1 text-sm leading-6 text-dark/50">
                Nordic Eatery
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
                <EditableCopy
                  value={text.notifyTitle}
                  textKey="kitchenClosed.notifyTitle"
                  page="kitchenClosed"
                />
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <EditableCopy
                  value={text.close}
                  textKey="kitchenClosed.close"
                  page="kitchenClosed"
                />
              </button>
            </div>
          ) : null}

          {showNotifyForm && status !== "success" ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="rounded-3xl border border-dark/10 p-4">
                <div className="mb-4 flex items-center gap-2 font-black text-dark">
                  <Bell className="h-5 w-5 text-paprika" />
                  <EditableCopy
                    value={text.notifyTitle}
                    textKey="kitchenClosed.notifyTitle"
                    page="kitchenClosed"
                  />
                </div>

                <div className="grid gap-3">
                  <label>
                    <span className="mb-2 flex items-center gap-2 text-sm font-bold text-dark/70">
                      <Mail className="h-4 w-4 text-paprika" />
                      <EditableCopy
                        value={text.email}
                        textKey="kitchenClosed.email"
                        page="kitchenClosed"
                      />
                    </span>

                    <input
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={text.emailPlaceholder}
                      className="input-field"
                    />
                  </label>
                </div>
              </div>

              <label className="flex items-start gap-3 text-sm leading-5 text-dark/70">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(event) =>
                    setMarketingConsent(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 shrink-0 accent-paprika"
                />
                <span>
                  <EditableCopy
                    value={text.marketing}
                    textKey="kitchenClosed.marketing"
                    page="kitchenClosed"
                  />
                </span>
              </label>
              <a
                href={`/${locale}/privacy`}
                target="_blank"
                rel="noreferrer"
                className="block text-sm underline"
              >
                <EditableCopy
                  value={text.privacy}
                  textKey="kitchenClosed.privacy"
                  page="kitchenClosed"
                />
              </a>

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
                      <EditableCopy
                        value={text.loading}
                        textKey="kitchenClosed.loading"
                        page="kitchenClosed"
                      />
                    </>
                  ) : (
                    <>
                      <BellRing className="h-5 w-5" />
                      <EditableCopy
                        value={text.submit}
                        textKey="kitchenClosed.submit"
                        page="kitchenClosed"
                      />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  <EditableCopy
                    value={text.later}
                    textKey="kitchenClosed.later"
                    page="kitchenClosed"
                  />
                </button>
              </div>
            </form>
          ) : null}

          {status === "success" ? (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />

                <div>
                  <p className="font-black">
                    <EditableCopy
                      value={text.success}
                      textKey="kitchenClosed.success"
                      page="kitchenClosed"
                    />
                  </p>

                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-100"
                  >
                    <EditableCopy
                      value={text.close}
                      textKey="kitchenClosed.close"
                      page="kitchenClosed"
                    />
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
