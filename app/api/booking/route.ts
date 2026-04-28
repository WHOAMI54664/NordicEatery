import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, phone, date, time, guests, message } = body;

    if (!name || !phone || !date || !time || !guests) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("booking_requests").insert({
      name,
      phone,
      date,
      time,
      guests: Number(guests),
      message: message || null,
    });

    if (error) {
      console.error("Supabase booking error:", error);
      return NextResponse.json(
        { error: "Failed to save booking" },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: "Mike's Food <onboarding@resend.dev>",
      to: process.env.BOOKING_EMAIL || "boking@nordiceatery.se",
      subject: "New booking request",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111;">
          <h2>New booking request</h2>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${time}</p>
          <p><strong>Guests:</strong> ${guests}</p>
          <p><strong>Message:</strong> ${message || "No message"}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Booking API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}