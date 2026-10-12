import PDFDocument from "pdfkit";

export type ReceiptOrder = {
  id: string;
  order_number: string | null;
  display_order_number: string | null;
  order_date: string | null;
  payment_method: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  total_gross: number | null;
  total_net: number | null;
  total_vat: number | null;
  vat_rate: number | null;
  discount_gross?: number | null;
  delivery_fee_gross?: number | null;
  address?: string | null;
  delivery_type?: string | null;
  customer_email?: string | null;
  items:
    | {
        name?: string;
        quantity?: number;
        price?: number;
        line_total_gross?: number;
      }[]
    | null;
  created_at: string | null;
  paid_at: string | null;
};

export function receiptFilename(order: ReceiptOrder) {
  const number = String(
    order.display_order_number || order.order_number || order.id,
  ).replace(/[^a-zA-Z0-9_-]/g, "-");
  return `nordic-eatery-kvitto-${number}.pdf`;
}

const money = (amount: number | null | undefined) =>
  new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(Number(amount ?? 0))
    .replace(/\u00a0/g, " ") + " kr";

// One renderer serves downloads and email attachments; all values are server snapshots.
export function generateReceiptPdf(order: ReceiptOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: "Betalningskvitto - Nordic Eatery",
        Author: "Nordic Eatery AB",
        CreationDate: new Date(order.paid_at || order.created_at || 0),
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const left = 48,
      width = 499,
      right = left + width;
    let y = 32;
    const ensure = (height: number) => {
      if (y + height > 790) {
        doc.addPage();
        y = 48;
      }
    };
    const rule = () => {
      doc
        .moveTo(left, y)
        .lineTo(right, y)
        .lineWidth(0.6)
        .strokeColor("#999")
        .stroke();
      y += 17;
    };
    const center = (text: string, size: number, bold = false) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .fillColor("#111");
      const height = doc.heightOfString(text, { width, align: "center" });
      ensure(height + 6);
      doc.text(text, left, y, { width, align: "center" });
      y += height + 6;
    };
    const row = (label: string, value: string, bold = false, size = 11) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .fillColor("#111");
      const h = Math.max(
        doc.heightOfString(label, { width: 210 }),
        doc.heightOfString(value, { width: 280 }),
      );
      ensure(h + 10);
      doc.text(label, left, y, { width: 210 });
      doc.text(value, left + 218, y, { width: 281, align: "right" });
      y += h + 6;
    };
    center("NORDIC EATERY", 29, true);
    center("L O C A L  S O U L ,  G L O B A L  T A S T E .", 9);
    y += 7;
    center("BETALNINGSKVITTO", 20, true);
    y += 6;
    rule();
    const number = order.display_order_number || order.order_number || order.id;
    row("Ordernummer", String(number));
    const date = order.paid_at || order.created_at;
    row(
      "Datum och tid",
      date
        ? new Intl.DateTimeFormat("sv-SE", {
            timeZone: "Europe/Stockholm",
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(date))
        : "-",
    );
    row("Beställning", "Online - takeaway");
    row(
      "Utlämningsplats",
      order.address && order.address !== "Pickup"
        ? order.address
        : "Foodtruck - se orderbekräftelsen",
    );
    y += 3;
    rule();
    const tableHeader = () => {
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111");
      doc.text("Produkt", left, y, { width: 320 });
      doc.text("Antal", left + 320, y, { width: 60, align: "center" });
      doc.text("Summa", left + 390, y, { width: 109, align: "right" });
      y += 24;
    };
    tableHeader();
    for (const item of order.items || []) {
      doc.font("Helvetica").fontSize(11);
      const name = item.name || "Produkt";
      const height = Math.max(14, doc.heightOfString(name, { width: 305 }));
      if (y + height + 12 > 755) {
        doc.addPage();
        y = 48;
        tableHeader();
        doc.font("Helvetica").fontSize(11);
      }
      doc.text(name, left, y, { width: 305 });
      doc.text(String(item.quantity ?? 0), left + 320, y, {
        width: 60,
        align: "center",
      });
      doc.text(
        money(
          item.line_total_gross ?? (item.price ?? 0) * (item.quantity ?? 0),
        ),
        left + 390,
        y,
        { width: 109, align: "right" },
      );
      y += height + 6;
    }
    ensure(160);
    y += 6;
    rule();
    if (order.discount_gross) row("Rabatt", `-${money(order.discount_gross)}`);
    if (order.delivery_fee_gross)
      row("Avgift", money(order.delivery_fee_gross));
    row("Summa exkl. moms", money(order.total_net));
    row(
      order.vat_rate == null ? "Moms" : `Moms ${order.vat_rate} %`,
      money(order.total_vat),
    );
    y += 5;
    rule();
    row("TOTALT BETALT", money(order.total_gross), true, 18);
    y += 7;
    rule();
    ensure(100);
    row(
      "Betalningsmetod",
      order.payment_method === "card" ? "Kortbetalning online" : "Swish",
    );
    row("Betalningsstatus", "Betald");
    row(
      "Transaktionsreferens",
      order.stripe_payment_intent_id || order.payment_reference || "-",
    );
    ensure(168);
    y += 5;
    rule();
    center("Tack för din beställning!", 18, true);
    center("We hope to see you again!", 11);
    y += 5;
    rule();
    center("Nordic Eatery AB", 12, true);
    for (const text of [
      "Sturegatan 18C, 961 33 Boden",
      "Org.nr: 559588-3686",
      "VAT: SE559588368601",
      "www.nordiceatery.se",
      "kontakt@nordiceatery.se",
      "073-310 68 86",
    ]) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(text, left, y, { width, align: "center" });
      y += 13;
    }
    doc.end();
  });
}
