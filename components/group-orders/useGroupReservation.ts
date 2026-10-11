"use client";
import { useEffect, useRef, useState } from "react";
import { useGroupAvailability } from "./useGroupAvailability";
import {
  isGroupAvailability,
  reservableSeats,
  validParticipantCount,
  type GroupReservation,
} from "@/lib/group-orders/slots";

export function useGroupReservation(enabled: boolean) {
  const { availability, failed, refresh } = useGroupAvailability(enabled);
  const [pickupAt, setPickupAt] = useState("");
  const [count, setCount] = useState("");
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const initialized = useRef(false);
  const request = useRef<AbortController | null>(null);
  const pending = useRef<Promise<GroupReservation | null> | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(timer);
      request.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!availability || initialized.current) return;
    initialized.current = true;
    const held = availability.reservation;
    setPickupAt(
      held?.pickupAt ||
        availability.slots.find((slot) => slot.available)?.pickupAt ||
        "",
    );
    if (held) setCount(String(held.participantCount));
  }, [availability]);

  const reservation =
    availability?.reservation &&
    Date.parse(availability.reservation.expiresAt) > now
      ? availability.reservation
      : null;
  const selectedSlot = availability?.slots.find(
    (slot) => slot.pickupAt === pickupAt,
  );
  const maximum =
    selectedSlot && Date.parse(selectedSlot.pickupAt) > now
      ? reservableSeats(selectedSlot, reservation, now)
      : 0;

  function reserve(
    target = pickupAt,
    value = count,
  ): Promise<GroupReservation | null> {
    if (pending.current) return pending.current;
    const participantCount = Number(value);
    if (!validParticipantCount(participantCount)) {
      setError("invalidParticipantCount");
      return Promise.resolve(null);
    }
    const slot = availability?.slots.find((slot) => slot.pickupAt === target);
    if (!slot || Date.parse(slot.pickupAt) <= Date.now()) {
      setError("slotUnavailable");
      return Promise.resolve(null);
    }
    if (participantCount > reservableSeats(slot, reservation)) {
      setError("capacityExhausted");
      refresh();
      return Promise.resolve(null);
    }
    if (
      reservation?.pickupAt === target &&
      reservation.participantCount === participantCount
    ) {
      return Promise.resolve(reservation);
    }
    const controller = new AbortController();
    request.current = controller;
    setHolding(true);
    setError("");
    const operation = (async () => {
      try {
        const response = await fetch("/api/group-orders/reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(12000),
          ]),
          body: JSON.stringify({
            action: "reserve",
            pickupAt: target,
            participantCount,
            reservationId: reservation?.id ?? null,
            version: reservation?.version ?? null,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "unavailable");
        if (!isGroupAvailability(result) || !result.reservation)
          throw new Error("unavailable");
        refresh(result);
        return result.reservation;
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : "unavailable");
          refresh();
        }
        return null;
      } finally {
        pending.current = null;
        if (!controller.signal.aborted) setHolding(false);
      }
    })();
    pending.current = operation;
    return operation;
  }

  function chooseSlot(value: string) {
    setPickupAt(value);
    setError("");
    if (validParticipantCount(Number(count))) void reserve(value, count);
  }
  async function release() {
    if (!reservation || holding) return;
    const controller = new AbortController();
    request.current = controller;
    setHolding(true);
    setError("");
    try {
      const response = await fetch("/api/group-orders/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(12000),
        ]),
        body: JSON.stringify({
          action: "release",
          reservationId: reservation.id,
          version: reservation.version,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "unavailable");
      if (!isGroupAvailability(result)) throw new Error("unavailable");
      refresh(result);
      setCount("");
    } catch (failure) {
      if (!controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "unavailable");
        refresh();
      }
    } finally {
      if (!controller.signal.aborted) setHolding(false);
    }
  }
  return {
    availability,
    failed,
    refresh,
    pickupAt,
    chooseSlot,
    count,
    setCount,
    maximum,
    reservation,
    holding,
    error,
    reserve,
    release,
  };
}
