import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  coordinatesFromInput,
  parseCoordinates,
  parseShiftUpdate,
  shiftUpdatePayload,
  truckMapUrl,
} from "../lib/restaurant/location";
import { getDeviceLocation } from "../lib/restaurant/device-location";

test("truck location validates complete bounded coordinates, including zero and decimal commas", () => {
  assert.deepEqual(coordinatesFromInput("0", "0"), {
    latitude: 0,
    longitude: 0,
  });
  assert.deepEqual(coordinatesFromInput(" -90 ", "180"), {
    latitude: -90,
    longitude: 180,
  });
  assert.deepEqual(coordinatesFromInput("65,825", "21,688"), {
    latitude: 65.825,
    longitude: 21.688,
  });
  assert.equal(coordinatesFromInput("", " "), null);
  for (const value of [
    { latitude: 91, longitude: 0 },
    { latitude: 0, longitude: -181 },
    { latitude: NaN, longitude: 0 },
    { latitude: 0, longitude: Infinity },
    { latitude: "1", longitude: 2 },
    {},
    [],
    "1,2",
  ])
    assert.throws(() => parseCoordinates(value), /invalidCoordinates/);
  for (const pair of [
    ["", "1"],
    ["1", ""],
    ["1e2", "1"],
    ["0x20", "1"],
    ["1,2,3", "1"],
  ])
    assert.throws(() => coordinatesFromInput(pair[0], pair[1]));
});

test("saving a location never changes shift status or opening metadata", () => {
  const existing = {
    is_open: true,
    opened_at: "before",
    opened_by: "owner",
    closed_at: null,
  };
  const payload = shiftUpdatePayload(
    parseShiftUpdate({
      action: "location",
      address: "",
      coordinates: { latitude: 0, longitude: 0 },
      is_open: false,
    }),
    "user",
    "now",
  );
  assert.deepEqual(
    { ...existing, ...payload },
    {
      ...existing,
      location_address: null,
      location_latitude: 0,
      location_longitude: 0,
      updated_at: "now",
    },
  );
  const closed = { ...existing, is_open: false };
  assert.equal({ ...closed, ...payload }.is_open, false);
  const legacy = shiftUpdatePayload(
    parseShiftUpdate({ action: "open", address: " New address " }),
    "user",
    "now",
  );
  assert.ok("location_latitude" in legacy);
  assert.equal(legacy.location_latitude, null);
  assert.equal(legacy.location_longitude, null);
  assert.equal(legacy.is_open, true);
  assert.deepEqual(
    shiftUpdatePayload(
      parseShiftUpdate({ action: "close", coordinates: "bad" }),
      "user",
      "now",
    ),
    { is_open: false, closed_at: "now", closed_by: "user", updated_at: "now" },
  );
});

test("location input rejects missing points, invalid addresses and actions", () => {
  for (const value of [
    null,
    [],
    {},
    { action: "delete" },
    { action: "location", address: "" },
    { action: "open", address: "a".repeat(301) },
    { action: "location", address: "a\n" },
    { action: "location", address: "place", coordinates: { latitude: 1 } },
  ])
    assert.throws(() => parseShiftUpdate(value));
  assert.equal(
    parseShiftUpdate({ action: "location", address: " A " }).address,
    "A",
  );
});

test("map links prefer exact coordinates and safely encode address text", () => {
  const url = new URL(truckMapUrl({ latitude: 0, longitude: -180 }, "other")!);
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.searchParams.get("query"), "0,-180");
  assert.equal(url.searchParams.get("api"), "1");
  const address = "javascript:alert(1)&query=elsewhere";
  const fallback = new URL(truckMapUrl(null, address)!);
  assert.equal(fallback.origin, "https://www.google.com");
  assert.equal(fallback.searchParams.get("query"), address);
  assert.equal(truckMapUrl(null, ""), null);
});

test("device location takes one fresh bounded reading and maps browser errors", async () => {
  let calls = 0;
  const device: Pick<Geolocation, "getCurrentPosition"> = {
    getCurrentPosition(success, _error, options) {
      calls++;
      assert.deepEqual(options, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      success({
        coords: { latitude: 65, longitude: 21, accuracy: 12 },
      } as GeolocationPosition);
    },
  };
  assert.deepEqual(await getDeviceLocation(device), {
    latitude: 65,
    longitude: 21,
    accuracy: 12,
  });
  assert.equal(calls, 1);
  await assert.rejects(getDeviceLocation(undefined), /geolocationUnsupported/);
  for (const [code, expected] of [
    [1, "geolocationDenied"],
    [2, "geolocationUnavailable"],
    [3, "geolocationTimeout"],
  ] as const) {
    await assert.rejects(
      getDeviceLocation({
        getCurrentPosition(_success, error) {
          error!({ code } as GeolocationPositionError);
        },
      }),
      new RegExp(expected),
    );
  }
  await assert.rejects(
    getDeviceLocation({
      getCurrentPosition(success) {
        success({
          coords: { latitude: NaN, longitude: 0 },
        } as GeolocationPosition);
      },
    }),
    /geolocationUnavailable/,
  );
});

test("truck location migration is repeatable, preserves the shift and enforces paired finite bounds", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE TABLE public.restaurant_shift_state (id integer PRIMARY KEY, is_open boolean, location_address text); INSERT INTO public.restaurant_shift_state VALUES (1,true,'Existing address');",
    );
    const migration = await readFile(
      new URL("../supabase-migration-truck-location.sql", import.meta.url),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(
      (await db.query("SELECT * FROM restaurant_shift_state")).rows,
      [
        {
          id: 1,
          is_open: true,
          location_address: "Existing address",
          location_latitude: null,
          location_longitude: null,
        },
      ],
    );
    for (const [lat, lng] of [
      [null, 1],
      [1, null],
      [91, 0],
      [0, 181],
      [NaN, 0],
      [0, Infinity],
    ]) {
      await assert.rejects(
        db.query(
          "UPDATE restaurant_shift_state SET location_latitude=$1,location_longitude=$2 WHERE id=1",
          [lat, lng],
        ),
        /restaurant_shift_location_coordinates_valid/,
      );
    }
    await db.exec(
      "UPDATE restaurant_shift_state SET location_latitude=-90,location_longitude=180 WHERE id=1",
    );
    assert.equal(
      (
        await db.query<{ is_open: boolean }>(
          "SELECT is_open FROM restaurant_shift_state",
        )
      ).rows[0].is_open,
      true,
    );
  } finally {
    await db.close();
  }
});
