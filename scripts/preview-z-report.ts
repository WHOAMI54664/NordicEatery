import { mkdir, writeFile } from "node:fs/promises";
import { generateZReportPdf } from "../lib/reports/z-report-pdf";
import type { ZReport } from "../lib/reports/z-report";
const report: ZReport = {
  id: 54,
  opened_at: "2026-06-28T17:17:00Z",
  closed_at: "2026-06-30T23:18:00Z",
  snapshot: {
    company: {
      name: "Nordic Eatery AB - EXEMPEL",
      address: "Sturegatan 18C 96133",
      location: "Boden, Sverige",
    },
    transactions: [
      {
        kind: "sale",
        orderId: "example",
        method: "card",
        rate: 6,
        gross: 11361,
        net: 10717.67,
        vat: 643.33,
        discount: 0,
        fee: 0,
        items: [
          { category: "Food", quantity: 64, gross: 8651 },
          { category: "Sides", quantity: 13, gross: 355 },
          { category: "Sodas", quantity: 65, gross: 1625 },
          { category: "Vegan", quantity: 6, gross: 730 },
        ],
      },
    ],
    grand: { sales: 438497.4, refunds: 320 },
    cancelled: { count: 0, gross: 0 },
    unfinished: { count: 0, gross: 0 },
  },
};
async function main() {
  await mkdir("output/pdf", { recursive: true });
  await writeFile(
    "output/pdf/nordic-eatery-z-report-example.pdf",
    await generateZReportPdf(report),
  );
  console.log(
    "Created output/pdf/nordic-eatery-z-report-example.pdf (sample data only)",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
