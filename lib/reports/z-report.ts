export type ZTransaction = {
  kind: "sale" | "refund";
  orderId: string;
  method: string | null;
  rate: number | null;
  gross: number;
  net: number | null;
  vat: number | null;
  discount: number;
  fee: number;
  items: { category: string; quantity: number; gross: number }[];
};
export type ZReport = {
  id: number;
  opened_at: string;
  closed_at: string;
  snapshot: {
    company: { name: string; address: string | null; location: string | null };
    transactions: ZTransaction[];
    grand: { sales: number; refunds: number };
    cancelled: { count: number; gross: number };
    unfinished: { count: number; gross: number };
  };
};
export const zReportFilename = (id: number) =>
  `nordic-eatery-z-rapport-${id}.pdf`;
export const zMoney = (cents: number) =>
  new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(cents / 100)
    .replace(/[\u00a0\u202f]/g, " ");
export const zDate = (value: string, dateOnly = false) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(dateOnly ? {} : ({ hour: "2-digit", minute: "2-digit" } as const)),
  }).format(new Date(value));
const cents = (value: number) => {
  if (value == null) throw new Error("Missing Z-report amount");
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount)) throw new Error("Invalid Z-report amount");
  return amount;
};
const categoryLabels: Record<string, string> = {
  drinks: "Drycker",
  sides: "Tillbehör",
  sauces: "Dip",
  burgare: "Burgare",
  knysza: "Knysza",
  maczanka: "Maczanka",
};
const paymentLabels: Record<string, string> = {
  cash: "Kontant",
  swish: "Swish",
  card: "Kort / Stripe",
};

export function summarizeZReport(report: ZReport) {
  const categories = new Map<
    string,
    { name: string; quantity: number; gross: number }
  >();
  const taxes = new Map<
    string,
    { rate: string; gross: number; net: number | null; vat: number | null }
  >();
  const payments = new Map<string, number>([
    ["Kontant", 0],
    ["Swish", 0],
    ["Kort / Stripe", 0],
  ]);
  let gross = 0,
    refunds = 0,
    receipts = 0,
    refundCount = 0,
    discount = 0,
    discountCount = 0,
    quantity = 0;
  for (const transaction of report.snapshot.transactions) {
    const amount = cents(transaction.gross),
      sign = transaction.kind === "sale" ? 1 : -1;
    const label = paymentLabels[transaction.method || ""] || "Övrigt";
    payments.set(label, (payments.get(label) || 0) + sign * amount);
    const rate =
      transaction.rate == null
        ? "Ej registrerad"
        : `${Number(transaction.rate)}%`;
    const tax = taxes.get(rate) || { rate, gross: 0, net: 0, vat: 0 };
    tax.gross += sign * amount;
    tax.net =
      tax.net == null || transaction.net == null
        ? null
        : tax.net + sign * cents(transaction.net);
    tax.vat =
      tax.vat == null || transaction.vat == null
        ? null
        : tax.vat + sign * cents(transaction.vat);
    taxes.set(rate, tax);
    if (transaction.kind === "refund") {
      refunds += amount;
      refundCount++;
      continue;
    }
    gross += amount;
    receipts++;
    discount += cents(transaction.discount);
    if (transaction.discount > 0) discountCount++;
    const fee = cents(transaction.fee);
    const items = transaction.items.map((item) => {
      if (
        !Number.isSafeInteger(Number(item.quantity)) ||
        Number(item.quantity) < 0
      )
        throw new Error("Invalid Z-report quantity");
      return {
        ...item,
        quantity: Number(item.quantity),
        weight: Math.max(0, cents(item.gross)),
      };
    });
    const weights = items.reduce((sum, item) => sum + item.weight, 0);
    // Allocate order discounts in whole öre, preserving the authoritative paid total.
    const target = amount - fee;
    const allocated = items.map((item) =>
      weights ? Math.floor((target * item.weight) / weights) : 0,
    );
    if (weights) {
      const ranking = items
        .map((item, index) => ({
          index,
          remainder: (target * item.weight) % weights,
        }))
        .sort((a, b) => b.remainder - a.remainder);
      const rest = target - allocated.reduce((sum, value) => sum + value, 0);
      for (let index = 0; index < rest; index++)
        allocated[ranking[index % ranking.length].index]++;
    }
    for (const [index, item] of items.entries()) {
      const name = `${categoryLabels[item.category] || item.category} ${rate}`;
      const row = categories.get(name) || { name, quantity: 0, gross: 0 };
      row.quantity += item.quantity;
      row.gross += allocated[index];
      quantity += item.quantity;
      categories.set(name, row);
    }
    if (!weights && target) {
      const name = `Okategoriserat ${rate}`,
        row = categories.get(name) || { name, quantity: 0, gross: 0 };
      row.gross += target;
      categories.set(name, row);
    }
    if (fee) {
      const name = `Avgifter ${rate}`,
        row = categories.get(name) || { name, quantity: 0, gross: 0 };
      row.gross += fee;
      categories.set(name, row);
    }
  }
  return {
    categories: [...categories.values()],
    taxes: [...taxes.values()],
    payments: [...payments].map(([name, amount]) => ({ name, amount })),
    gross,
    refunds,
    total: gross - refunds,
    quantity,
    receipts,
    refundCount,
    discount,
    discountCount,
    grandSales: cents(report.snapshot.grand.sales),
    grandRefunds: cents(report.snapshot.grand.refunds),
  };
}
