"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function useKitchenSound() {
  const context = useRef<AudioContext | null>(null);
  const wanted = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const play = useCallback(() => {
    const audio = context.current;
    if (!wanted.current) return;
    if (!audio || audio.state !== "running") {
      setEnabled(false);
      setFailed(true);
      return;
    }
    // Short three-note chime, with envelopes to avoid speaker clicks.
    [784, 988, 1175].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * 0.22;
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.36);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  }, []);
  const enable = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const audio = (context.current ||= new AudioContext());
      audio.onstatechange = () =>
        setEnabled(wanted.current && audio.state === "running");
      wanted.current = true;
      await audio.resume();
      if (audio.state !== "running") throw new Error("Audio blocked");
      setEnabled(true);
      play();
    } catch {
      setFailed(true);
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, [busy, play]);
  const mute = useCallback(() => {
    wanted.current = false;
    setEnabled(false);
    setFailed(false);
  }, []);
  useEffect(
    () => () => {
      wanted.current = false;
      const audio = context.current;
      context.current = null;
      if (audio) {
        audio.onstatechange = null;
        void audio.close().catch(() => {});
      }
    },
    [],
  );
  return { enabled, failed, busy, enable, mute, play };
}
