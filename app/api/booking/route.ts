import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const brand = {
  cream: "#FFF7EA",
  paper: "#FFFCF6",
  paprika: "#B51F26",
  cherry: "#7B1018",
  honey: "#E0A12B",
  dark: "#24140F",
  muted: "#7B6A61",
  border: "#EADDCF",
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function createReservationNumber() {
  const date = new Date();

  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `NE-${year}${month}${day}-${random}`;
}

function translateBookingService(value: string) {
  const map: Record<string, string> = {
    table: "Table booking",
    catering: "Catering",
    foodTruck: "Food truck",
  };

  return map[value] || value;
}

function translateBookingType(value: string) {
  const map: Record<string, string> = {
    breakfast: "Breakfast",
    brunch: "Brunch",
    lunch: "Lunch",
    dinner: "Dinner",
    conference: "Conference",
    other: "Other",
  };

  return map[value] || value;
}

function detailRow(label: string, value: unknown) {
  if (!value) return "";

  return `
    <tr>
      <td style="padding: 13px 0; color: ${brand.muted}; font-size: 14px; border-bottom: 1px solid ${brand.border};">
        ${escapeHtml(label)}
      </td>
      <td style="padding: 13px 0; color: ${brand.dark}; font-size: 14px; font-weight: 800; text-align: right; border-bottom: 1px solid ${brand.border};">
        ${escapeHtml(value)}
      </td>
    </tr>
  `;
}

function createBookingEmailHtml({
                                  variant,
                                  reservationNumber,
                                  bookingService,
                                  bookingType,
                                  name,
                                  phone,
                                  email,
                                  date,
                                  time,
                                  guests,
                                  eventDetails,
                                  message,
                                }: {
  variant: "owner" | "client";
  reservationNumber: string;
  bookingService: string;
  bookingType: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  guests: number;
  eventDetails?: string | null;
  message?: string | null;
}) {
  const isOwner = variant === "owner";

  const eyebrow = isOwner
      ? "New booking request"
      : "Booking request received";

  const title = isOwner
      ? "New booking request"
      : "Thank you for your booking!";

  const intro = isOwner
      ? "A customer has submitted a new booking request through the Nordic Eatery website. Review the details and contact the customer to confirm."
      : "We have received your booking request. Our team will review the details and contact you as soon as possible to confirm everything.";

  const serviceLabel = translateBookingService(bookingService);
  const typeLabel = translateBookingType(bookingType);

  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>

  <body style="margin:0; padding:0; background:${brand.cream}; font-family: Arial, Helvetica, sans-serif;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
      ${escapeHtml(intro)}
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brand.cream}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px;">
            <tr>
              <td style="padding: 0 0 18px 0; text-align:center;">
                <div style="font-size: 28px; font-weight: 900; letter-spacing: -1px; color:${brand.dark};">
                  Nordic<span style="color:${brand.paprika};">Eatery</span>
                </div>
              </td>
            </tr>

            <tr>
              <td style="border-radius: 32px; overflow: hidden; background:${brand.paper}; box-shadow: 0 20px 50px rgba(76,35,20,0.12); border: 1px solid ${brand.border};">
                <div style="background: linear-gradient(135deg, ${brand.cherry}, ${brand.paprika}, ${brand.honey}); padding: 42px 34px; color: white;">
                  <div style="display:inline-block; padding: 9px 14px; border-radius: 999px; background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.20); font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                    ${escapeHtml(eyebrow)}
                  </div>

                  <h1 style="margin: 22px 0 0 0; font-size: 40px; line-height: 0.95; letter-spacing: -2px; font-weight: 900;">
                    ${escapeHtml(title)}
                  </h1>

                  <p style="margin: 18px 0 0 0; max-width: 540px; font-size: 16px; line-height: 1.7; color: rgba(255,255,255,0.90);">
                    ${escapeHtml(intro)}
                  </p>
                </div>

                <div style="padding: 34px;">
                  <div style="display:inline-block; margin-bottom: 22px; padding: 10px 14px; border-radius: 999px; background:${brand.cream}; color:${brand.paprika}; font-size: 13px; font-weight: 900; border: 1px solid ${brand.border};">
                    Reservation ${escapeHtml(reservationNumber)}
                  </div>

                  <h2 style="margin:0; color:${brand.dark}; font-size: 24px; line-height: 1.1; letter-spacing: -1px; font-weight: 900;">
                    Booking details
                  </h2>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 18px;">
                    ${detailRow("Reservation number", reservationNumber)}
                    ${detailRow("Booking service", serviceLabel)}
                    ${detailRow("Booking type", typeLabel)}
                    ${detailRow("Guests", guests)}
                    ${detailRow("Date", date)}
                    ${detailRow("Time", time)}
                    ${detailRow("Name", name)}
                    ${detailRow("Phone", phone)}
                    ${detailRow("Email", email)}
                  </table>

                  ${
      eventDetails
          ? `
                        <div style="margin-top: 24px; padding: 18px; border-radius: 22px; background: ${brand.cream}; border: 1px solid ${brand.border};">
                          <div style="font-size: 13px; color:${brand.muted}; font-weight: 800; margin-bottom: 8px;">
                            Event details
                          </div>
                          <div style="font-size: 15px; color:${brand.dark}; line-height: 1.7;">
                            ${escapeHtml(eventDetails)}
                          </div>
                        </div>
                      `
          : ""
  }

                  ${
      message
          ? `
                        <div style="margin-top: 16px; padding: 18px; border-radius: 22px; background: white; border: 1px solid ${brand.border};">
                          <div style="font-size: 13px; color:${brand.muted}; font-weight: 800; margin-bottom: 8px;">
                            Message
                          </div>
                          <div style="font-size: 15px; color:${brand.dark}; line-height: 1.7;">
                            ${escapeHtml(message)}
                          </div>
                        </div>
                      `
          : ""
  }

                  ${
      !isOwner
          ? `
                        <div style="margin-top: 28px; padding: 22px; border-radius: 24px; background: white; border: 1px solid ${brand.border};">
                          <h3 style="margin:0; color:${brand.dark}; font-size: 18px; font-weight: 900;">
                            What happens next?
                          </h3>

                          <p style="margin: 10px 0 0 0; color:${brand.muted}; font-size: 14px; line-height: 1.7;">
                            We will review your request and contact you to confirm the booking. If something changes, you can reply directly to this email.
                          </p>

                          <div style="margin-top: 18px;">
                            <a href="mailto:${escapeHtml(process.env.BOOKING_EMAIL || "bokning@nordiceatery.se")}" style="display:inline-block; text-decoration:none; background:${brand.paprika}; color:white; padding: 13px 18px; border-radius: 999px; font-size: 13px; font-weight: 900;">
                              Contact Nordic Eatery
                            </a>
                          </div>
                        </div>
                      `
          : `
                        <div style="margin-top: 28px; padding: 22px; border-radius: 24px; background: white; border: 1px solid ${brand.border};">
                          <h3 style="margin:0; color:${brand.dark}; font-size: 18px; font-weight: 900;">
                            Customer contact
                          </h3>

                          <p style="margin: 10px 0 0 0; color:${brand.muted}; font-size: 14px; line-height: 1.7;">
                            Reply directly to this email to contact the customer.
                          </p>
                        </div>
                      `
  }
                </div>
              </td>
            </tr>

            <tr>
              <td style="text-align:center; padding: 20px 12px 0 12px;">
                <p style="margin:0; color:${brand.muted}; font-size: 12px; line-height: 1.6;">
                  Nordic Eatery — real food, fast service and no compromise.
                </p>
                <p style="margin:8px 0 0 0; color:${brand.muted}; font-size: 12px;">
                  Boden, Sweden · nordiceatery.se
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
          { error: "Missing RESEND_API_KEY" },
          { status: 500 }
      );
    }

    const body = await request.json();

    const {
      bookingService,
      bookingType,
      name,
      phone,
      email,
      date,
      time,
      guests,
      eventDetails,
      message,
      consent,
    } = body;

    const guestsNumber = Number(guests);

    if (
        !bookingService ||
        !bookingType ||
        !name ||
        !phone ||
        !email ||
        !date ||
        !time ||
        !guests ||
        !consent
    ) {
      return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
      );
    }

    const minimumGuests = bookingService === "table" ? 2 : 10;

    if (Number.isNaN(guestsNumber) || guestsNumber < minimumGuests) {
      return NextResponse.json(
          {
            error:
                bookingService === "table"
                    ? "Minimum table booking is 2 guests"
                    : "Minimum booking is 10 guests",
          },
          { status: 400 }
      );
    }

    const reservationNumber = createReservationNumber();

    const supabase = await createClient();

    const { error } = await supabase.from("booking_requests").insert({
      reservation_number: reservationNumber,
      status: "new",
      booking_service: bookingService,
      booking_type: bookingType,
      name,
      phone,
      email,
      date,
      time,
      guests: guestsNumber,
      event_details: eventDetails || null,
      message: message || null,
      consent: Boolean(consent),
    });

    if (error) {
      console.error("Supabase booking error:", error);

      return NextResponse.json(
          { error: "Failed to save booking" },
          { status: 500 }
      );
    }

    const serviceLabel = translateBookingService(String(bookingService));

    const ownerEmailHtml = createBookingEmailHtml({
      variant: "owner",
      reservationNumber,
      bookingService: String(bookingService),
      bookingType: String(bookingType),
      name: String(name),
      phone: String(phone),
      email: String(email),
      date: String(date),
      time: String(time),
      guests: guestsNumber,
      eventDetails: eventDetails ? String(eventDetails) : null,
      message: message ? String(message) : null,
    });

    const clientAutoReplyHtml = createBookingEmailHtml({
      variant: "client",
      reservationNumber,
      bookingService: String(bookingService),
      bookingType: String(bookingType),
      name: String(name),
      phone: String(phone),
      email: String(email),
      date: String(date),
      time: String(time),
      guests: guestsNumber,
      eventDetails: eventDetails ? String(eventDetails) : null,
      message: message ? String(message) : null,
    });

    const fromEmail = "Nordic Eatery <booking@nordiceatery.se>";
    const bookingEmail = process.env.BOOKING_EMAIL || "bokning@nordiceatery.se";

    await resend.emails.send({
      from: fromEmail,
      to: bookingEmail,
      replyTo: String(email),
      subject: `New booking ${reservationNumber}: ${serviceLabel} — ${guestsNumber} guests`,
      html: ownerEmailHtml,
    });

    await resend.emails.send({
      from: fromEmail,
      to: String(email),
      replyTo: bookingEmail,
      subject: `Your booking ${reservationNumber} — Nordic Eatery`,
      html: clientAutoReplyHtml,
    });

    await sendTelegramMessage(`
🔥 Ny bokning

🧾 Bokningsnummer: ${reservationNumber}

📌 Bokning: ${bookingService}
🍽 Typ: ${bookingType}
👥 Personer: ${guestsNumber}

📅 Datum: ${date}
⏰ Tid: ${time}

👤 ${name}
📞 ${phone}
📧 ${email}

📝 Detaljer:
${eventDetails || "Inga detaljer"}

💬 Meddelande:
${message || "Inget meddelande"}
`);

    return NextResponse.json({
      success: true,
      reservationNumber,
    });
  } catch (error) {
    console.error("Booking API error:", error);

    return NextResponse.json(
        { error: "Something went wrong" },
        { status: 500 }
    );
  }
}
