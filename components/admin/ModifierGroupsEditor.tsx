"use client";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ModifierGroup } from "@/lib/menu-options";
export function ModifierGroupsEditor({
  value,
  onChange,
}: {
  value: ModifierGroup[];
  onChange: (groups: ModifierGroup[]) => void;
}) {
  const t = useTranslations("modifierEditor");
  const field =
    "mt-1 w-full rounded-xl border border-dark/15 bg-white px-3 py-2 text-sm";
  function update(id: string, patch: Partial<ModifierGroup>) {
    onChange(
      value.map((group) => (group.id === id ? { ...group, ...patch } : group)),
    );
  }
  return (
    <section className="mt-8 border-t border-dark/10 pt-6">
      <h3 className="text-xl font-black">{t("title")}</h3>
      <p className="mt-2 text-sm leading-6 text-dark/60">{t("description")}</p>
      <div className="mt-5 space-y-5">
        {value.map((group, index) => (
          <fieldset
            key={group.id}
            className="rounded-2xl border border-dark/10 bg-cream/50 p-4"
          >
            <legend className="px-1 text-sm font-bold">
              {t("group", { number: index + 1 })}
            </legend>
            <div className="flex items-end gap-3">
              <label className="flex-1 text-xs font-bold">
                {t("groupName")}
                <input
                  required
                  maxLength={80}
                  value={group.name}
                  onChange={(event) =>
                    update(group.id, { name: event.target.value })
                  }
                  className={field}
                  placeholder={t("groupPlaceholder")}
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((item) => item.id !== group.id))
                }
                aria-label={t("removeGroup")}
                className="mb-1 p-2 text-paprika"
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">
                {t("minimum")}
                <input
                  type="number"
                  required
                  min={0}
                  max={group.max}
                  value={group.min}
                  onChange={(event) =>
                    update(group.id, { min: Number(event.target.value) })
                  }
                  className={field}
                />
              </label>
              <label className="text-xs font-bold">
                {t("maximum")}
                <input
                  type="number"
                  required
                  min={1}
                  max={Math.max(1, group.options.length)}
                  value={group.max}
                  onChange={(event) =>
                    update(group.id, { max: Number(event.target.value) })
                  }
                  className={field}
                />
              </label>
            </div>
            <div className="mt-4 space-y-3">
              {group.options.map((option) => (
                <div key={option.id} className="flex items-end gap-2">
                  <label className="min-w-0 flex-1 text-xs font-bold">
                    {t("optionName")}
                    <input
                      required
                      maxLength={80}
                      value={option.name}
                      onChange={(event) =>
                        update(group.id, {
                          options: group.options.map((item) =>
                            item.id === option.id
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        })
                      }
                      className={field}
                      placeholder={t("optionPlaceholder")}
                    />
                  </label>
                  <label className="w-24 text-xs font-bold">
                    {t("extraPrice")}
                    <input
                      type="number"
                      required
                      min={0}
                      max={1000}
                      step="0.01"
                      value={option.price / 100}
                      onChange={(event) =>
                        update(group.id, {
                          options: group.options.map((item) =>
                            item.id === option.id
                              ? {
                                  ...item,
                                  price: Math.round(
                                    Number(event.target.value) * 100,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                      className={field}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={group.options.length <= 1}
                    aria-label={t("removeOption")}
                    className="mb-1 p-2 text-paprika disabled:opacity-30"
                    onClick={() => {
                      const options = group.options.filter(
                        (item) => item.id !== option.id,
                      );
                      update(group.id, {
                        options,
                        max: Math.min(group.max, options.length),
                        min: Math.min(group.min, options.length),
                      });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={group.options.length >= 20}
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-paprika disabled:opacity-30"
              onClick={() =>
                update(group.id, {
                  options: [
                    ...group.options,
                    { id: crypto.randomUUID(), name: "", price: 0 },
                  ],
                })
              }
            >
              <Plus size={16} />
              {t("addOption")}
            </button>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        disabled={value.length >= 8}
        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-dark/15 bg-white px-4 py-3 text-sm font-bold disabled:opacity-30"
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              name: "",
              min: 1,
              max: 1,
              options: [{ id: crypto.randomUUID(), name: "", price: 0 }],
            },
          ])
        }
      >
        <Plus size={16} />
        {t("addGroup")}
      </button>
    </section>
  );
}
