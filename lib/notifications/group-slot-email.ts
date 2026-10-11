import { emailLocale } from "./opening-email";

const copy = {
  sv: {
    subject: "Lediga tider för gruppbeställningar",
    body: "Du bad oss meddela när gruppbeställningar blir tillgängliga. Nu finns lediga tider! Först till kvarn — tiden bokas när du skapar gruppen.",
    action: "Boka gruppbeställning",
    stop: "Avsluta denna avisering",
  },
  en: {
    subject: "Group order slots are available",
    body: "You asked us to notify you when group ordering becomes available. There are free slots now! First come, first served — your slot is reserved when you create the group.",
    action: "Book a group order",
    stop: "Cancel this notification",
  },
  ru: {
    subject: "Появились места для групповых заказов",
    body: "Вы просили сообщить, когда появятся групповые заказы. Сейчас есть свободные слоты! Место закрепляется за тем, кто первым создаст группу.",
    action: "Забронировать групповой заказ",
    stop: "Отменить это уведомление",
  },
  pl: {
    subject: "Dostępne terminy zamówień grupowych",
    body: "Prosisz o powiadomienie, gdy zamówienia grupowe będą dostępne. Są już wolne terminy! Termin rezerwuje osoba, która jako pierwsza utworzy grupę.",
    action: "Zarezerwuj zamówienie grupowe",
    stop: "Anuluj to powiadomienie",
  },
};
export function groupSlotMessage(
  locale: unknown,
  token: string,
  origin: string,
) {
  const language = emailLocale(locale);
  const text = copy[language];
  const url = `${origin}/${language}/group-order`;
  const unsubscribe = `${origin}/api/group-order-notifications/unsubscribe?token=${encodeURIComponent(token)}`;
  return {
    subject: text.subject,
    text: `${text.body}\n\n${text.action}: ${url}\n\n${text.stop}: ${unsubscribe}`,
  };
}
