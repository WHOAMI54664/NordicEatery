"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Clock,
  LocateFixed,
  MapPin,
  ExternalLink,
  Save,
  Loader2,
  Lock,
  Power,
  ShieldCheck,
  Unlock,
} from "lucide-react";

import {
  coordinatesFromInput,
  truckMapUrl,
  type TruckCoordinates,
} from "@/lib/restaurant/location";
import { getDeviceLocation } from "@/lib/restaurant/device-location";

type ShiftState = {
  coordinates: TruckCoordinates | null;
  isOpen: boolean;
  openedAt: string | null;
  closedAt: string | null;
  updatedAt: string | null;
  locationAddress: string | null;
};

function formatStockholmTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ShiftControlCard() {
  const t = useTranslations("admin.shift");

  const [shift, setShift] = useState<ShiftState | null>(null);
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const locationRequest = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchShift = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/shift", {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(t("errors.load"));
        return;
      }

      setShift(data.shift);
      setAddress(data.shift?.locationAddress || "");
      setLatitude(data.shift?.coordinates?.latitude?.toString() ?? "");
      setLongitude(data.shift?.coordinates?.longitude?.toString() ?? "");
      setErrorMessage("");
    } catch (error) {
      console.error("Shift fetch error:", error);
      setErrorMessage(t("errors.load"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  async function updateShift(action: "open" | "close" | "location") {
    if (!shift || isUpdating || isLocating) return;
    let coordinates: TruckCoordinates | null = null;
    if (action !== "close") {
      try {
        coordinates = coordinatesFromInput(latitude, longitude);
      } catch {
        setErrorMessage(t("errors.invalidCoordinates"));
        return;
      }
      if (!address.trim() && !coordinates) {
        setErrorMessage(t("errors.locationRequired"));
        return;
      }
    }

    setIsUpdating(true);
    setErrorMessage("");
    setSavedMessage("");

    try {
      const response = await fetch("/api/admin/shift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, address: address.trim(), coordinates }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(
          t.has(`errors.${data.error}`)
            ? t(`errors.${data.error}`)
            : t("errors.update"),
        );
        return;
      }

      setShift(data.shift);
      setAddress(data.shift.locationAddress || "");
      setLatitude(data.shift.coordinates?.latitude?.toString() ?? "");
      setLongitude(data.shift.coordinates?.longitude?.toString() ?? "");
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("nordic-truck-location");
        channel.postMessage("updated");
        channel.close();
      }
      if (action === "location") setSavedMessage(t("locationSaved"));
    } catch (error) {
      console.error("Shift update error:", error);
      setErrorMessage(t("errors.update"));
    } finally {
      setIsUpdating(false);
    }
  }

  useEffect(() => {
    void fetchShift();
    const pendingLocation = locationRequest;
    return () => {
      pendingLocation.current++;
    };
  }, [fetchShift]);

  function changed(coordinatesChanged = false) {
    if (coordinatesChanged) setAddress("");
    setSavedMessage("");
    setErrorMessage("");
    setAccuracy(null);
  }
  async function locate() {
    const request = ++locationRequest.current;
    setIsLocating(true);
    setErrorMessage("");
    setSavedMessage("");
    try {
      const point = await getDeviceLocation(navigator.geolocation);
      if (request !== locationRequest.current) return;
      setLatitude(point.latitude.toFixed(6));
      setLongitude(point.longitude.toFixed(6));
      setAddress("");
      setAccuracy(
        Number.isFinite(point.accuracy) ? Math.round(point.accuracy) : null,
      );
      await resolveAddress(point, request);
    } catch (error) {
      if (request !== locationRequest.current) return;
      const code =
        error instanceof Error ? error.message : "geolocationUnavailable";
      setErrorMessage(
        t.has(`errors.${code}`)
          ? t(`errors.${code}`)
          : t("errors.geolocationUnavailable"),
      );
    } finally {
      if (request === locationRequest.current) setIsLocating(false);
    }
  }
  async function resolveAddress(
    coordinates: TruckCoordinates,
    request: number,
  ) {
    const response = await fetch("/api/admin/shift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve-location", coordinates }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("geocodingUnavailable");
    const data = await response.json();
    if (request === locationRequest.current) setAddress(data.address);
  }
  async function findAddress() {
    let coordinates;
    try {
      coordinates = coordinatesFromInput(latitude, longitude);
    } catch {
      setErrorMessage(t("errors.invalidCoordinates"));
      return;
    }
    if (!coordinates) {
      setErrorMessage(t("errors.invalidCoordinates"));
      return;
    }
    const request = ++locationRequest.current;
    setIsLocating(true);
    setErrorMessage("");
    setSavedMessage("");
    try {
      await resolveAddress(coordinates, request);
    } catch {
      if (request === locationRequest.current)
        setErrorMessage(t("errors.geocodingUnavailable"));
    } finally {
      if (request === locationRequest.current) setIsLocating(false);
    }
  }
  let mapUrl: string | null = null;
  try {
    mapUrl = truckMapUrl(coordinatesFromInput(latitude, longitude), address);
  } catch {
    /* A partial coordinate must not produce a misleading map link. */
  }

  const isOpen = Boolean(shift?.isOpen);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/90 p-4 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,27,35,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,159,64,0.14),transparent_36%)]" />

      <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:h-16 sm:w-16 ${
              isOpen
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
            }`}
          >
            {isOpen ? (
              <Unlock className="h-6 w-6" />
            ) : (
              <Lock className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black ${
                  isOpen
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                    : "border-[#E51B23]/15 bg-[#E51B23]/8 text-[#C7192E]"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {isLoading ? t("checking") : isOpen ? t("open") : t("closed")}
              </span>
            </div>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-[#25120F] sm:text-3xl">
              {isLoading
                ? t("loading")
                : isOpen
                  ? t("titleOpen")
                  : t("titleClosed")}
            </h2>

            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#7B6A61]">
              {isOpen ? t("descriptionOpen") : t("descriptionClosed")}
            </p>

            <div className="mt-4 grid gap-2 text-xs font-bold text-[#7B6A61] md:grid-cols-2">
              <div className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#C7192E]" />
                <span className="shrink-0 text-[#25120F]">{t("opened")}:</span>
                <span className="truncate">
                  {formatStockholmTime(shift?.openedAt || null)}
                </span>
              </div>

              <div className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#EADDCF] bg-white/70 px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0 text-[#7B6A61]" />
                <span className="shrink-0 text-[#25120F]">
                  {t("closedAt")}:
                </span>
                <span className="truncate">
                  {formatStockholmTime(shift?.closedAt || null)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="shift-location-address"
                className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#A39388]"
              >
                {t("addressLabel")}
              </label>
              <input
                id="shift-location-address"
                type="text"
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  changed();
                }}
                maxLength={300}
                placeholder={t("addressPlaceholder")}
                disabled={!shift || isLoading || isUpdating || isLocating}
                className="w-full rounded-2xl border border-[#EADDCF] bg-white/80 px-4 py-3 text-sm font-medium text-[#25120F] outline-none transition placeholder:text-[#A39388] focus:border-[#E51B23]/50 focus:ring-4 focus:ring-[#E51B23]/10 disabled:opacity-60"
              />
              <p className="mt-1.5 text-xs font-medium text-[#7B6A61]">
                {t("addressHint")}
              </p>
              <fieldset className="mt-5 rounded-2xl border border-[#EADDCF] bg-white/70 p-4">
                <legend className="flex items-center gap-2 px-1 text-sm font-black text-[#25120F]">
                  <MapPin size={16} />
                  {t("coordinatesTitle")}
                </legend>
                <p className="text-xs leading-5 text-[#7B6A61]">
                  {t("coordinatesHint")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!shift || isLoading || isUpdating || isLocating}
                    onClick={() => void locate()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25120F] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {isLocating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LocateFixed size={16} />
                    )}
                    {t(isLocating ? "locating" : "locateButton")}
                  </button>
                  {isLocating && (
                    <button
                      type="button"
                      onClick={() => {
                        locationRequest.current++;
                        setIsLocating(false);
                      }}
                      className="rounded-xl px-3 py-2 text-sm font-bold"
                    >
                      {t("cancelLocation")}
                    </button>
                  )}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold">
                    {t("latitude")}
                    <input
                      value={latitude}
                      onChange={(event) => {
                        setLatitude(event.target.value);
                        changed(true);
                      }}
                      inputMode="decimal"
                      placeholder="65.8250"
                      maxLength={20}
                      disabled={!shift || isLoading || isUpdating || isLocating}
                      className="mt-1 w-full rounded-xl border border-[#EADDCF] bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                    />
                  </label>
                  <label className="text-xs font-bold">
                    {t("longitude")}
                    <input
                      value={longitude}
                      onChange={(event) => {
                        setLongitude(event.target.value);
                        changed(true);
                      }}
                      inputMode="decimal"
                      placeholder="21.6880"
                      maxLength={20}
                      disabled={!shift || isLoading || isUpdating || isLocating}
                      className="mt-1 w-full rounded-xl border border-[#EADDCF] bg-white px-3 py-2.5 text-sm disabled:opacity-50"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => void findAddress()}
                    disabled={
                      !latitude ||
                      !longitude ||
                      isLoading ||
                      isUpdating ||
                      isLocating
                    }
                    className="text-sm font-bold text-[#C7192E] underline disabled:opacity-50"
                  >
                    {t("findAddress")}
                  </button>
                  <a
                    href="https://www.openstreetmap.org/copyright"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#7B6A61]"
                  >
                    © OpenStreetMap contributors · Photon
                  </a>
                </div>
                {accuracy !== null && (
                  <p role="status" className="mt-2 text-xs text-[#7B6A61]">
                    {t("accuracy", { meters: accuracy })}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold">
                  {mapUrl && (
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#C7192E] underline"
                    >
                      <ExternalLink size={15} />
                      {t("previewMap")}
                    </a>
                  )}
                  {(latitude || longitude) && (
                    <button
                      type="button"
                      disabled={isUpdating || isLocating}
                      onClick={() => {
                        setLatitude("");
                        setLongitude("");
                        changed();
                      }}
                      className="text-[#7B6A61] underline disabled:opacity-50"
                    >
                      {t("clearCoordinates")}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!shift || isLoading || isUpdating || isLocating}
                  onClick={() => void updateShift("location")}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#C7192E]/25 bg-[#C7192E]/5 px-4 py-3 text-sm font-black text-[#C7192E] disabled:opacity-50"
                >
                  <Save size={16} />
                  {t("saveLocation")}
                </button>
              </fieldset>
            </div>
          </div>
        </div>

        <div className="flex w-full lg:w-[230px]">
          <button
            type="button"
            disabled={!shift || isLoading || isUpdating || isLocating}
            onClick={() => updateShift(isOpen ? "close" : "open")}
            className={`inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isOpen
                ? "bg-[#2A1712] hover:opacity-90"
                : "bg-[#E51B23] shadow-[#E51B23]/15 hover:bg-[#C7192E]"
            }`}
          >
            {isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}

            {isOpen ? t("closeButton") : t("openButton")}
          </button>
        </div>
      </div>

      {savedMessage && (
        <p
          role="status"
          className="relative mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"
        >
          {savedMessage}
        </p>
      )}
      {errorMessage ? (
        <div
          role="alert"
          className="relative mt-4 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 p-3 text-sm font-bold text-[#C7192E]"
        >
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
