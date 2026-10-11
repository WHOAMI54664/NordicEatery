import assert from "node:assert/strict";
import { test } from "node:test";
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "../i18n/routing";
import middleware from "../middleware";
import { getPublicPath, publicPathnames, publicLocales } from "../i18n/paths";

test("Swedish navigation URLs match their labels", () => {
  const paths = {
    menu: "meny",
    about: "om-oss",
    booking: "bokning",
    mikes: "foodtruck",
    catering: "catering",
    contact: "kontakt",
    support: "faq",
    cart: "vagn",
  };
  for (const [internal, external] of Object.entries(paths)) {
    assert.equal(getPublicPath("sv", `/${internal}`), `/sv/${external}`);
  }
});

test("legacy page URLs permanently redirect once, preserving the query", async () => {
  for (const [internal, translated] of Object.entries(publicPathnames)) {
    for (const locale of publicLocales) {
      if (internal === translated[locale]) continue;
      const response = await middleware(
        new NextRequest(
          `https://www.nordiceatery.se/${locale}${internal}?category=drinks`,
        ),
      );
      assert.equal(response.status, 308);
      assert.equal(
        response.headers.get("location"),
        `https://www.nordiceatery.se/${locale}${translated[locale]}?category=drinks`,
      );
    }
  }
});

test("language switching resolves each public pathname back to the same page", () => {
  for (const [internal, paths] of Object.entries(publicPathnames)) {
    for (const from of publicLocales) {
      for (const to of publicLocales) {
        assert.equal(
          getPublicPath(to, `/${from}${paths[from]}`),
          `/${to}${paths[to]}`,
        );
      }
      assert.equal(getPublicPath(from, internal), `/${from}${paths[from]}`);
    }
  }
});

test("category filters, fragments and unrelated routes retain their meaning", () => {
  assert.equal(
    getPublicPath("sv", "/menu?category=kebab%20meal#menu-catalog"),
    "/sv/meny?category=kebab%20meal#menu-catalog",
  );
  for (const path of [
    "/admin/menu",
    "/checkout/success?session_id=example",
    "/group-order/abc",
    "/profile/login",
    "/order/123",
  ]) {
    assert.equal(getPublicPath("sv", path), `/sv${path}`);
  }
  assert.equal(getPublicPath("sv", "/"), "/sv");
  assert.equal(getPublicPath("en", "/sv/"), "/en");
});

test("public URLs rewrite to existing pages while retaining category filters", () => {
  const middleware = createMiddleware(routing);
  for (const [internal, translated] of Object.entries(publicPathnames)) {
    for (const locale of publicLocales) {
      const url = `https://www.nordiceatery.se/${locale}${translated[locale]}?category=drinks`;
      const response = middleware(new NextRequest(url));
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("location"), null);
      const destination = response.headers.get("x-middleware-rewrite") || url;
      assert.equal(new URL(destination).pathname, `/${locale}${internal}`);
      assert.equal(new URL(destination).search, "?category=drinks");
    }
  }
});

test("localized public routing leaves protected and dynamic routes unchanged", () => {
  const middleware = createMiddleware(routing);
  for (const path of [
    "/sv/admin/menu",
    "/sv/profile",
    "/sv/checkout",
    "/sv/checkout/success",
    "/sv/group-order/abc",
    "/sv/order/123",
  ]) {
    const response = middleware(
      new NextRequest(`https://www.nordiceatery.se${path}`),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-rewrite"), null);
    assert.equal(response.headers.get("location"), null);
  }
});
