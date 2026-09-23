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
  const details = {
    sv: { badge: "KÖKET ÄR ÖPPET", heading: "Hungrig? Vi är redo.", intro: "Din nästa favorit väntar.", footer: "Du får det här mejlet eftersom du bad oss meddela dig när köket öppnar." },
    en: { badge: "THE KITCHEN IS OPEN", heading: "Hungry? We’re ready.", intro: "Your next favourite is waiting.", footer: "You received this email because you asked to be notified when our kitchen opens." },
    ru: { badge: "КУХНЯ ОТКРЫТА", heading: "Проголодались? Мы готовы.", intro: "Ваше любимое блюдо уже ждёт.", footer: "Вы получили это письмо, потому что попросили сообщить об открытии кухни." },
    pl: { badge: "KUCHNIA JEST OTWARTA", heading: "Głodni? Jesteśmy gotowi.", intro: "Twój kolejny ulubiony smak już czeka.", footer: "Otrzymujesz tę wiadomość, ponieważ prosisz o powiadomienie o otwarciu kuchni." },
  }[language];
  const html = `<!doctype html>
<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.subject}</title></head>
<body style="margin:0;padding:0;background:#f2eee7;color:#241e1b;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${copy.body}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2eee7;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fffcf7;border-radius:24px;overflow:hidden;">
<tr><td align="center" style="padding:30px 24px 20px;"><a href="${menu}"><img src="https://www.nordiceatery.se/logo9.png" width="164" alt="Nordic Eatery" style="display:block;width:164px;height:auto;border:0;"></a></td></tr>
<tr><td align="center" style="padding:8px 24px 0;font-size:11px;line-height:18px;letter-spacing:2px;font-weight:bold;color:#b51f26;">${details.badge}</td></tr>
<tr><td align="center" style="padding:14px 24px 8px;"><h1 style="margin:0;font-family:Georgia,serif;font-size:38px;line-height:1.12;font-weight:bold;">${details.heading}</h1><p style="margin:14px 0 0;font-size:16px;line-height:24px;color:#6c5d54;">${details.intro}</p></td></tr>
<tr><td align="center" style="padding:12px 24px 0;"><a href="${menu}"><img src="https://bspclxildhjnkoniiyos.supabase.co/storage/v1/object/public/product-images/products/1778537040594-rz3y484w93.png" alt="Maczanka · Nordic Eatery" width="440" style="display:block;width:100%;max-width:440px;height:auto;border:0;"></a></td></tr>
<tr><td align="center" style="padding:12px 32px 22px;font-size:16px;line-height:25px;color:#6c5d54;">${copy.body}</td></tr>
<tr><td align="center" style="padding:0 24px 32px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="#b51f26" style="border-radius:12px;mso-padding-alt:17px 28px;"><a href="${menu}" style="display:inline-block;padding:17px 28px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border:1px solid #b51f26;border-radius:12px;">${copy.menu} &nbsp; →</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:22px 24px;background:#29211d;color:#fffcf7;font-family:Georgia,serif;font-size:19px;line-height:26px;">Local Soul. Global Taste.<br><span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px;color:#d6c7b8;">NORDIC EATERY · BODEN</span></td></tr>
</table>
<table role="presentation" width="540" cellspacing="0" cellpadding="0" style="width:100%;max-width:540px;"><tr><td align="center" style="padding:24px 16px;font-size:12px;line-height:19px;color:#786e65;">${details.footer}<br><a href="${unsubscribe}" style="color:#786e65;text-decoration:underline;">${copy.stop}</a><br><br>Nordic Eatery · Sturegatan 18C · 96133 Boden</td></tr></table>
</td></tr></table></body></html>`;
  return { subject: copy.subject, html, text: `${copy.body}\n\n${copy.menu}: ${menu}\n\n${copy.stop}: ${unsubscribe}` };
}
