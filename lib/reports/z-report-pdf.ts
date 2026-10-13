import PDFDocument from "pdfkit";
import { summarizeZReport, zDate, zMoney, type ZReport } from "./z-report";

// Frozen report data and dates make retries produce the same attachment.
export function generateZReportPdf(report: ZReport): Promise<Buffer> {
  const s = summarizeZReport(report);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 42,
      bufferPages: true,
      info: {
        Title: `Z-Rapport: ${report.id}`,
        Author: report.snapshot.company.name,
        CreationDate: new Date(report.closed_at),
        ModDate: new Date(report.closed_at),
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    const left = 44,
      width = 507,
      right = left + width,
      rowHeight = 14;
    let y = 42;
    const text = (
      value: string,
      x: number,
      top: number,
      w: number,
      bold = false,
      align: "left" | "right" = "left",
      size = 9,
    ) => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size)
        .fillColor("#111")
        .text(value, x, top, {
          width: w,
          align,
          lineBreak: false,
          ellipsis: true,
        });
    };
    const header = (value: string, x: number, top: number, w: number) => {
      doc.rect(x, top, w, 13).fill("#d4d4d4");
      text(value, x + 2, top + 2, w - 4, true);
    };
    const line = (top: number, strong = false) =>
      doc
        .moveTo(left, top)
        .lineTo(right, top)
        .lineWidth(strong ? 1.2 : 0.4)
        .strokeColor(strong ? "#222" : "#ddd")
        .stroke();
    const ensure = (height: number) => {
      if (y + height > 760) {
        doc.addPage();
        y = 42;
        text(`Z-Rapport: ${report.id} - fortsättning`, left, y, width, true);
        y += 26;
      }
    };
    const title = report.snapshot.company;
    text(`Butik: ${title.name}`, left + 245, y, 262, true, "right", 11);
    text(
      [title.address, title.location].filter(Boolean).join(", "),
      left + 230,
      y + 15,
      277,
      true,
      "right",
      9,
    );
    text("Kassabeteckning: Webbshop", left + 245, y + 29, 262, true, "right");
    text(`Z-Rapport: ${report.id}`, left + 245, y + 43, 262, true, "right", 11);
    text(
      `Datum: ${zDate(report.closed_at, true)}`,
      left + 245,
      y + 58,
      262,
      true,
      "right",
    );
    text(`Från: ${zDate(report.opened_at)}`, left, y + 29, 240, true);
    text(`Till: ${zDate(report.closed_at)}`, left, y + 43, 240, true);
    text(`Genererad: ${zDate(report.closed_at)}`, left, y + 58, 240, true);
    y += 94;
    const salesHeader = (label: string) => {
      header(label, left, y, width);
      text("Procent Totalt", left + 290, y + 2, 80, true, "right");
      text("Snitt", left + 374, y + 2, 45, true, "right");
      text("Summa", left + 424, y + 2, 81, true, "right");
      y += 16;
    };
    salesHeader("x. Huvudgrupp");
    for (const item of s.categories) {
      if (y + rowHeight > 750) {
        ensure(40);
        salesHeader("x. Huvudgrupp (forts.)");
      }
      text(`${item.quantity} x ${item.name}`, left + 6, y, 282);
      text(
        `${s.gross ? ((item.gross / s.gross) * 100).toFixed(2) : "0.00"}%`,
        left + 295,
        y,
        74,
        false,
        "right",
      );
      text(
        item.quantity ? zMoney(Math.round(item.gross / item.quantity)) : "-",
        left + 374,
        y,
        45,
        false,
        "right",
      );
      text(zMoney(item.gross), left + 424, y, 81, false, "right");
      y += rowHeight;
    }
    ensure(75);
    line(y);
    y += 5;
    text(`Total försäljning: ${s.quantity} x`, left, y, 330, true, "left", 11);
    text(zMoney(s.gross), left + 380, y, 125, true, "right", 11);
    y += 25;
    salesHeader("x. Huvudgrupp returer");
    text(`Total returer: ${s.refundCount} x`, left, y, 330, true);
    text(zMoney(s.refunds), left + 380, y, 125, true, "right");
    y += 16;
    line(y, true);
    y += 6;
    text("Total:", left, y, 300, true, "left", 11);
    text(zMoney(s.total), left + 380, y, 125, true, "right", 11);
    y += 29;

    const tableHeight =
      Math.max(s.taxes.length + 2, s.payments.length + 2) * rowHeight + 16;
    ensure(tableHeight + 12);
    const taxX = left,
      payX = left + 275,
      taxW = 240,
      payW = 232;
    for (const [label, x, w] of [
      ["Moms%", taxX, 56],
      ["Moms", taxX + 58, 54],
      ["Netto", taxX + 114, 62],
      ["Brutto", taxX + 178, 62],
    ] as const)
      header(label, x, y, w);
    header("Likvida Medel", payX, y, payW);
    const tableTop = y + 17;
    let taxY = tableTop;
    for (const tax of s.taxes) {
      text(tax.rate, taxX + 1, taxY, 56);
      text(
        tax.vat == null ? "-" : zMoney(tax.vat),
        taxX + 58,
        taxY,
        54,
        false,
        "right",
      );
      text(
        tax.net == null ? "-" : zMoney(tax.net),
        taxX + 114,
        taxY,
        62,
        false,
        "right",
      );
      text(zMoney(tax.gross), taxX + 178, taxY, 62, false, "right");
      taxY += rowHeight;
    }
    const totalTax = (key: "net" | "vat") =>
      s.taxes.some((t) => t[key] == null)
        ? "-"
        : zMoney(s.taxes.reduce((sum, t) => sum + t[key]!, 0));
    text("Tot.", taxX + 1, taxY, 56);
    text(totalTax("vat"), taxX + 58, taxY, 54, false, "right");
    text(totalTax("net"), taxX + 114, taxY, 62, false, "right");
    text(zMoney(s.total), taxX + 178, taxY, 62, false, "right");
    let payY = tableTop;
    for (const payment of s.payments) {
      text(payment.name, payX, payY, 140);
      text(zMoney(payment.amount), payX + 142, payY, 88, false, "right");
      payY += rowHeight;
    }
    text("Totalt", payX, payY, 140);
    text(zMoney(s.total), payX + 142, payY, 88, false, "right");
    y += tableHeight + 16;

    ensure(133);
    const metric = (
      label: string,
      value: string,
      x: number,
      top: number,
      w: number,
    ) => {
      header(label, x, top, w);
      text(value, x + 3, top + 17, w - 6);
    };
    const c1 = 214,
      c2 = 82,
      c3 = 211;
    metric(
      "Rabatter",
      `${s.discountCount}                         ${zMoney(s.discount)}`,
      left,
      y,
      c1,
    );
    metric("Kvittokopior", "-", left + c1 + 2, y, c2 - 4);
    for (const [i, label, value] of [
      [0, "Avrundning", "-"],
      [1, "Grand total försäljning", zMoney(s.grandSales)],
      [2, "Grand total retur", zMoney(s.grandRefunds)],
      [3, "Grand total netto", zMoney(s.grandSales - s.grandRefunds)],
    ] as const) {
      header(label, left + c1 + c2 + 2, y + i * 16, c3 - 70);
      text(value, right - 68, y + i * 16 + 2, 66, false, "right");
    }
    metric("Borttagna artiklar från varukorgen", "-", left, y + 32, c1);
    metric(
      "Kassakvitton",
      `${s.receipts}   ${zMoney(s.gross)}`,
      left + c1 + 2,
      y + 32,
      c2 - 4,
    );
    metric(
      "Avbrutna köp / Borttagna ordrar",
      `${report.snapshot.cancelled.count}                         ${zMoney(Math.round(report.snapshot.cancelled.gross * 100))}`,
      left,
      y + 64,
      c1,
    );
    metric(
      "Returer",
      `${s.refundCount}   ${zMoney(s.refunds)}`,
      left + c1 + 2,
      y + 64,
      c2 - 4,
    );
    metric(
      "Oavslutade försäljningar",
      `${report.snapshot.unfinished.count}                         ${zMoney(Math.round(report.snapshot.unfinished.gross * 100))}`,
      left,
      y + 96,
      c1,
    );
    y += 143;
    ensure(100);
    header("Kassalåda - Session 1", left, y, width);
    y += 17;
    header("Inbetalningar", left, y, 112);
    header("Utbetalningar", left + 115, y, 115);
    text("-", left + 3, y + 17, 100);
    text("-", left + 118, y + 17, 100);
    for (const [index, label] of [
      "Lådöppningar",
      "Ingående växelkassa",
      "Utgående växelkassa",
    ].entries()) {
      header(label, left + 234, y + index * 16, 235);
      text("-", right - 24, y + index * 16 + 2, 22, false, "right");
    }
    y += 66;
    text(
      "Endast webbshop. - = uppgiften registreras inte i webbshoppen.",
      left,
      y,
      width,
      false,
      "left",
      7,
    );
    text(
      "Returer avser orderbelopp. Sena betalningar och nya returer tas med i nästa rapport.",
      left,
      y + 11,
      width,
      false,
      "left",
      7,
    );
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      text(`${i + 1} / ${pages.count}`, left, 790, width, false, "right", 7);
    }
    doc.end();
  });
}
