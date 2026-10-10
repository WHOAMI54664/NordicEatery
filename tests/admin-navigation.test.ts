import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  adminSections,
  adminSearchTerm,
  currentAdminSection,
  visibleAdminSections,
} from "../lib/admin/navigation";

test("admin navigation keeps owner, administrator and cook boundaries across every locale", () => {
  assert.deepEqual(
    visibleAdminSections("cook").map((s) => s.id),
    ["kitchen", "kitchen-display", "account"],
  );
  assert.ok(!visibleAdminSections("admin").some((s) => s.id === "staff"));
  assert.equal(visibleAdminSections("owner").length, adminSections.length);
  for (const locale of ["sv", "en", "ru", "pl"]) {
    assert.equal(
      currentAdminSection(`/${locale}/admin/products/salad/edit`, locale)?.id,
      "products",
    );
    assert.equal(
      currentAdminSection(`/${locale}/admin/kitchen-display`, locale)?.id,
      "kitchen-display",
    );
    assert.equal(
      currentAdminSection(`/${locale}/admin/products-other`, locale),
      undefined,
    );
    const messages = JSON.parse(
      readFileSync(
        new URL(`../messages/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ).admin;
    for (const section of adminSections) {
      const [namespace, key] = section.label.split(".");
      assert.equal(
        typeof messages[namespace]?.[key],
        "string",
        `${locale}: ${section.label}`,
      );
    }
  }
});

test("admin search cannot add PostgREST filter expressions", () => {
  assert.equal(adminSearchTerm("  Цезарь  "), "Цезарь");
  assert.equal(adminSearchTerm("070-1234567"), "070-1234567");
  assert.equal(adminSearchTerm("staff@example.com"), "staff@example.com");
  assert.equal(
    adminSearchTerm('a%,id.neq.null,(name.eq."b")\\'),
    "a id.neq.null name.eq. b",
  );
  assert.equal(adminSearchTerm("x".repeat(200)).length, 100);
});

test("admin counters and relative times retain their count interpolation in every locale", () => {
  for (const locale of ["en", "sv", "pl", "ru"]) {
    const admin = JSON.parse(
      readFileSync(
        new URL(`../messages/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ).admin;
    for (const key of [
      "dashboard.minutesAgo",
      "dashboard.hoursAgo",
      "dashboard.daysAgo",
      "analytics.lastOrders",
      "analytics.shown",
      "inventory.productsCount",
      "orders.ordersCount",
      "orders.itemsCount",
    ]) {
      const [group, name] = key.split(".");
      assert.ok(admin[group][name].includes("{count}"), `${locale}: ${key}`);
    }
  }
});
