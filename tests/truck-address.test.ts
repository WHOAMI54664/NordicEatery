import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePublicTruckLocation } from "../lib/restaurant/location";
import { completeShiftLocation } from "../lib/restaurant/location-update";
import {
  parseGeocodingResult,
  addressForCoordinates,
} from "../lib/restaurant/geocoding";

const oldPoint = { latitude: 65, longitude: 21 };
const newPoint = { latitude: 65.83, longitude: 21.69 };
const previous = { address: "Old address", coordinates: oldPoint };
const feature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [21.69, 65.83] },
  properties: {
    street: "Kungsgatan",
    housenumber: "12",
    city: "Boden",
    postcode: "961 31",
    country: "Sverige",
  },
};

test("a moved truck replaces its previous address and preserves the exact GPS point", async () => {
  const update = {
    action: "location" as const,
    address: "Old address",
    coordinates: newPoint,
  };
  const completed = await completeShiftLocation(
    update,
    previous,
    async (point) => {
      assert.deepEqual(point, newPoint);
      return "New address";
    },
  );
  assert.deepEqual(completed, { ...update, address: "New address" });
  assert.deepEqual(update.address, "Old address");
  await assert.rejects(
    completeShiftLocation(update, previous, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});

test("manual address corrections survive; unchanged points and closing need no geocoder", async () => {
  for (const update of [
    {
      action: "location" as const,
      address: "Custom entrance",
      coordinates: newPoint,
    },
    {
      action: "location" as const,
      address: "Old address",
      coordinates: oldPoint,
    },
    { action: "close" as const },
    { action: "location" as const, address: "New address", coordinates: null },
  ]) {
    assert.deepEqual(
      await completeShiftLocation(update, previous, async () => {
        assert.fail("Unexpected geocoding request");
      }),
      update,
    );
  }
  const blank = await completeShiftLocation(
    { action: "open", address: "", coordinates: newPoint },
    previous,
    async () => "Resolved address",
  );
  assert.equal(blank.address, "Resolved address");
});

test("public location drops closed-shift coordinates and rejects malformed refreshes", () => {
  assert.deepEqual(
    parsePublicTruckLocation({
      isOpen: false,
      address: "Private draft",
      coordinates: newPoint,
    }),
    { isOpen: false, address: null, coordinates: null, approximate: false },
  );
  assert.deepEqual(
    parsePublicTruckLocation({
      isOpen: true,
      address: "New address",
      coordinates: newPoint,
      approximate: false,
    }),
    {
      isOpen: true,
      address: "New address",
      coordinates: newPoint,
      approximate: false,
    },
  );
  for (const value of [
    null,
    {},
    { isOpen: "true" },
    { isOpen: true, address: 3 },
    {
      isOpen: true,
      address: "x",
      coordinates: { latitude: 999, longitude: 0 },
    },
  ])
    assert.throws(() => parsePublicTruckLocation(value));
});

test("geocoder parsing uses GeoJSON longitude first and rejects malformed results", () => {
  assert.deepEqual(parseGeocodingResult({ features: [feature] }), {
    coordinates: newPoint,
    address: "Kungsgatan 12, 961 31 Boden, Sverige",
  });
  for (const result of [
    null,
    {},
    { features: [] },
    {
      features: [
        { ...feature, geometry: { type: "LineString", coordinates: [21, 65] } },
      ],
    },
    { features: [{ ...feature, properties: { name: "x\nsecret" } }] },
    {
      features: [
        { ...feature, geometry: { type: "Point", coordinates: [NaN, 65] } },
      ],
    },
  ])
    assert.equal(parseGeocodingResult(result), null);
});

test("reverse geocoder calls are bounded, cached and use a fixed destination", async (t) => {
  const requests: URL[] = [];
  t.mock.method(
    globalThis,
    "fetch",
    async (
      input: URL,
      init: RequestInit & { next?: { revalidate: number } },
    ) => {
      const url = new URL(input);
      requests.push(url);
      assert.equal(url.origin, "https://photon.komoot.io");
      assert.equal(init.cache, "force-cache");
      assert.equal(init.next?.revalidate, 86400);
      assert.equal(init.redirect, "error");
      assert.ok(init.signal);
      return new Response(JSON.stringify({ features: [feature] }), {
        status: 200,
      });
    },
  );
  assert.equal(
    await addressForCoordinates(newPoint),
    "Kungsgatan 12, 961 31 Boden, Sverige",
  );
  assert.equal(requests[0].pathname, "/reverse");
  assert.equal(requests[0].searchParams.get("lat"), "65.830000");
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("down", { status: 503 }),
  );
  await assert.rejects(addressForCoordinates(newPoint), /geocodingUnavailable/);
});
