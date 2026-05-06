import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function POST(request: Request) {
  try {
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

    const safeReservationNumber = escapeHtml(reservationNumber);
    const safeBookingService = escapeHtml(bookingService);
    const safeBookingType = escapeHtml(bookingType);
    const safeName = escapeHtml(name);
    const safePhone = escapeHtml(phone);
    const safeEmail = escapeHtml(email);
    const safeDate = escapeHtml(date);
    const safeTime = escapeHtml(time);
    const safeGuests = escapeHtml(guestsNumber);
    const safeEventDetails = escapeHtml(eventDetails || "Inga detaljer angivna");
    const safeMessage = escapeHtml(message || "Inget meddelande");

    const ownerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #24140F;">
        <h2>Ny bokningsförfrågan</h2>

        <p><strong>Bokningsnummer:</strong> ${safeReservationNumber}</p>
        <p><strong>Bokning:</strong> ${safeBookingService}</p>
        <p><strong>Typ:</strong> ${safeBookingType}</p>
        <p><strong>Antal personer:</strong> ${safeGuests}</p>
        <p><strong>Datum:</strong> ${safeDate}</p>
        <p><strong>Tid:</strong> ${safeTime}</p>

        <hr />

        <p><strong>Namn:</strong> ${safeName}</p>
        <p><strong>Telefon:</strong> ${safePhone}</p>
        <p><strong>E-post:</strong> ${safeEmail}</p>

        <hr />

        <p><strong>Detaljer:</strong><br/>${safeEventDetails}</p>
        <p><strong>Meddelande:</strong><br/>${safeMessage}</p>
      </div>
    `;

    const clientAutoReplyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #24140F;">
        <h2>Tack för din bokning</h2>

        <p>Hej ${safeName},</p>

        <p>
          Vi har tagit emot din bokningsförfrågan och återkommer inom kort.
        </p>

        <p>
          <strong>Bokningsnummer:</strong> ${safeReservationNumber}<br/>
          <strong>${safeBookingService}</strong><br/>
          ${safeBookingType}<br/>
          ${safeGuests} personer<br/>
          ${safeDate} kl. ${safeTime}
        </p>

        <p>
          Du kan svara direkt på detta mejl om något behöver ändras.
        </p>

        <p>— Nordic Eatery</p>
      </div>
    `;

    await resend.emails.send({
      from: "Nordic Eatery <boking@nordiceatery.se>",
      to: process.env.BOOKING_EMAIL || "bokning@nordiceatery.se",
      replyTo: email,
      subject: `Ny bokning ${safeReservationNumber}: ${safeBookingService} — ${safeGuests} pers`,
      html: ownerEmailHtml,
    });

    await resend.emails.send({
      from: "Nordic Eatery <boking@nordiceatery.se>",
      to: email,
      replyTo: process.env.BOOKING_EMAIL || "bokning@nordiceatery.se",
      subject: `Din bokning ${safeReservationNumber} — Nordic Eatery`,
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
