"use client";
import { Check } from "lucide-react";
import { useId, type Dispatch, type SetStateAction } from "react";
import { useEditableTranslations } from "@/components/site-content/EditableMessage";
import type { ModifierGroup, Selection } from "@/lib/menu-options";

export function ModifierChoices({
  groups,
  selections,
  setSelections,
  locale,
}: {
  groups: ModifierGroup[];
  selections: Selection[];
  setSelections: Dispatch<SetStateAction<Selection[]>>;
  locale: string;
}) {
  const c = useEditableTranslations("customization");
  const titleId = useId();
  const money = (value: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "SEK",
    }).format(value / 100);
  function toggle(groupId: string, optionId: string, single: boolean) {
    setSelections((current) => {
      const previous =
        current.find((value) => value.groupId === groupId)?.optionIds || [];
      const next = previous.includes(optionId)
        ? previous.filter((id) => id !== optionId)
        : single
          ? [optionId]
          : [...previous, optionId];
      return [
        ...current.filter((value) => value.groupId !== groupId),
        ...(next.length ? [{ groupId, optionIds: next }] : []),
      ];
    });
  }
  return (
    <div className="space-y-6">
      {groups.map((optionGroup) => {
        const selected =
          selections.find((value) => value.groupId === optionGroup.id)
            ?.optionIds || [];
        const complete = selected.length >= optionGroup.min;
        return (
          <fieldset
            key={optionGroup.id}
            className="rounded-2xl border border-dark/10 bg-white p-4"
          >
            <legend className="px-1 font-black">{optionGroup.name}</legend>
            <div className="mb-3 flex items-center justify-between gap-2 text-xs">
              <span
                className={complete ? "text-dark/60" : "font-bold text-paprika"}
              >
                {c.edit(optionGroup.min ? "required" : "optional")} ·{" "}
                {optionGroup.min === optionGroup.max
                  ? c.edit("chooseExact", { count: optionGroup.max })
                  : c.edit("chooseRange", {
                      min: optionGroup.min,
                      max: optionGroup.max,
                    })}
              </span>
              <span className="font-semibold">
                {selected.length}/{optionGroup.max}
              </span>
            </div>
            <div className="space-y-2">
              {optionGroup.options.map((option) => {
                const checked = selected.includes(option.id);
                return (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checked ? "border-paprika bg-paprika/5" : "border-dark/10 hover:border-dark/30"}`}
                  >
                    <input
                      type={optionGroup.max === 1 ? "radio" : "checkbox"}
                      name={`${titleId}-${optionGroup.id}`}
                      checked={checked}
                      onChange={() =>
                        toggle(optionGroup.id, option.id, optionGroup.max === 1)
                      }
                      disabled={
                        !checked &&
                        optionGroup.max > 1 &&
                        selected.length >= optionGroup.max
                      }
                      className="h-5 w-5 accent-paprika"
                    />
                    <span className="flex-1 text-sm font-bold">
                      {option.name}
                    </span>
                    <span className="text-sm text-dark/65">
                      {option.price ? `+${money(option.price)}` : c.edit("included")}
                    </span>
                    {checked && (
                      <Check
                        size={16}
                        className="text-paprika"
                        aria-hidden="true"
                      />
                    )}
                  </label>
                );
              })}
            </div>
            {!optionGroup.min &&
              optionGroup.max === 1 &&
              selected.length > 0 && (
                <button
                  type="button"
                  className="mt-3 text-xs font-bold text-paprika underline"
                  onClick={() =>
                    setSelections((current) =>
                      current.filter(
                        (value) => value.groupId !== optionGroup.id,
                      ),
                    )
                  }
                >
                  {c.edit("clear")}
                </button>
              )}
          </fieldset>
        );
      })}
    </div>
  );
}
