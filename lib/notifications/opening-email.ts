export const CONSENT_VERSION = "email-news-v1";
export const openingCopy = {
  sv: { subject: "Nordic Eatery har öppnat!", body: "Du bad oss meddela dig när köket öppnar. Nu tar vi emot beställningar!", menu: "Se menyn och beställ", stop: "Avsluta e-postprenumerationer" },
  en: { subject: "Nordic Eatery is open!", body: "You asked us to let you know when the kitchen opens. We are now accepting orders!", menu: "View the menu and order", stop: "Unsubscribe from emails" },
  ru: { subject: "Nordic Eatery — кухня открыта!", body: "Вы просили сообщить об открытии кухни. Теперь мы принимаем заказы!", menu: "Посмотреть меню и заказать", stop: "Отписаться от писем" },
  pl: { subject: "Nordic Eatery jest otwarte!", body: "Prosiliście o powiadomienie o otwarciu kuchni. Przyjmujemy już zamówienia!", menu: "Zobacz menu i zamów", stop: "Zrezygnuj z wiadomości" },
};
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
}
export function emailLocale(value: unknown): keyof typeof openingCopy {
  return typeof value === "string" && Object.hasOwn(openingCopy, value) ? value as keyof typeof openingCopy : "sv";
}
export function openingMessage(locale: unknown, token: string) {
  const language = emailLocale(locale);
  const copy = openingCopy[language];
  const menu = `https://www.nordiceatery.se/${language}/menu`;
  const unsubscribe = `https://www.nordiceatery.se/api/email-unsubscribe?token=${encodeURIComponent(token)}`;
  return { subject: copy.subject, text: `${copy.body}\n\n${copy.menu}: ${menu}\n\n${copy.stop}: ${unsubscribe}` };
}
