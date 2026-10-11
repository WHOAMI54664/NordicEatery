"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil } from "lucide-react";

export function EditPencil({
  label,
  textKey,
  onEdit,
}: {
  label: string;
  textKey: string;
  onEdit: () => void;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    zIndex: number;
    target: HTMLElement;
  } | null>(null);
  useEffect(() => {
    const element = anchor.current;
    if (!element) return;
    let frame = 0;
    let intersects = false;
    function measure() {
      frame = 0;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const target = element.closest("dialog") || document.body;
      const modal = element.closest('[role="dialog"]');
      const zIndex = Math.max(
        60,
        modal ? (Number(getComputedStyle(modal).zIndex) || 0) + 1 : 60,
      );
      // Portals keep real buttons outside links, labels and submit buttons.
      // A product dialog is a top-layer surface, so its pencils belong there.
      const visible =
        intersects &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < innerHeight;
      setPosition((previous) => {
        if (!visible) return null;
        if (
          previous?.left === rect.left &&
          previous.top === rect.top &&
          previous.target === target &&
          previous.zIndex === zIndex
        )
          return previous;
        return { left: rect.left, top: rect.top, target, zIndex };
      });
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    if (element.parentElement) resize.observe(element.parentElement);
    const intersection = new IntersectionObserver(
      (entries) => {
        intersects =
          entries[0]?.isIntersecting === true &&
          entries[0].intersectionRatio > 0.9;
        schedule();
      },
      { threshold: [0, 0.9, 1] },
    );
    intersection.observe(element);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    window.addEventListener("animationend", schedule, true);
    measure();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("animationend", schedule, true);
    };
  }, [label]);
  return (
    <>
      <span
        ref={anchor}
        aria-hidden="true"
        className="ml-1 inline-block h-6 w-6 shrink-0 align-middle"
      />
      {position &&
        createPortal(
          <button
            type="button"
            data-edit-key={textKey}
            aria-label={label}
            title={label}
            className="inline-edit-pencil inline-flex h-6 w-6 items-center justify-center rounded-full border border-paprika/30 bg-white text-paprika shadow-sm hover:bg-paprika hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paprika"
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              zIndex: position.zIndex,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
            onKeyUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onEdit();
            }}
          >
            <Pencil size={13} aria-hidden="true" />
          </button>,
          position.target,
        )}
    </>
  );
}
