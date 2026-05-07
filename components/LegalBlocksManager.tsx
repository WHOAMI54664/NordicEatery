"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

export type SiteBlock = {
    id: string;
    page: string;
    locale: string;
    title: string;
    body: string;
    sort_order: number;
};

type LegalBlocksManagerProps = {
    page: string;
    locale: string;
    canEdit: boolean;
    initialBlocks: SiteBlock[];
};

export function LegalBlocksManager({
                                       page,
                                       locale,
                                       canEdit,
                                       initialBlocks,
                                   }: LegalBlocksManagerProps) {
    const [blocks, setBlocks] = useState<SiteBlock[]>(initialBlocks);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    function updateLocalBlock(
        id: string,
        field: "title" | "body",
        value: string
    ) {
        setBlocks((current) =>
            current.map((block) =>
                block.id === id ? { ...block, [field]: value } : block
            )
        );
    }

    async function addBlock() {
        setIsAdding(true);

        const response = await fetch("/api/admin/site-blocks", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                page,
                locale,
                title: "New section",
                body: "Write your text here.",
                sort_order: blocks.length + 1,
            }),
        });

        setIsAdding(false);

        const data = await response.json();

        if (!response.ok || !data.block) {
            alert(data.error || "Could not add block");
            return;
        }

        setBlocks((current) => [...current, data.block]);
    }

    async function saveBlock(block: SiteBlock) {
        setSavingId(block.id);

        const response = await fetch("/api/admin/site-blocks", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: block.id,
                title: block.title,
                body: block.body,
                sort_order: block.sort_order,
            }),
        });

        setSavingId(null);

        const data = await response.json();

        if (!response.ok || !data.block) {
            alert(data.error || "Could not save block");
            return;
        }

        setBlocks((current) =>
            current.map((item) => (item.id === block.id ? data.block : item))
        );
    }

    async function deleteBlock(id: string) {
        const confirmed = window.confirm("Delete this block?");

        if (!confirmed) return;

        const response = await fetch("/api/admin/site-blocks", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ id }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "Could not delete block");
            return;
        }

        setBlocks((current) => current.filter((block) => block.id !== id));
    }

    return (
        <div className="mt-12 space-y-6">
            {blocks.map((block) => (
                <section
                    key={block.id}
                    className="rounded-3xl bg-white/70 p-6 shadow-md backdrop-blur"
                >
                    {canEdit ? (
                        <div className="space-y-4">
                            <input
                                value={block.title}
                                onChange={(event) =>
                                    updateLocalBlock(block.id, "title", event.target.value)
                                }
                                className="w-full rounded-2xl border border-black/10 bg-white px-5 py-4 text-2xl font-black text-dark outline-none transition focus:border-paprika"
                                placeholder="Section title"
                            />

                            <textarea
                                value={block.body}
                                onChange={(event) =>
                                    updateLocalBlock(block.id, "body", event.target.value)
                                }
                                rows={5}
                                className="w-full resize-none rounded-2xl border border-black/10 bg-white px-5 py-4 leading-7 text-dark/60 outline-none transition focus:border-paprika"
                                placeholder="Section text"
                            />

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => saveBlock(block)}
                                    disabled={savingId === block.id}
                                    className="inline-flex items-center gap-2 rounded-full bg-paprika px-5 py-3 text-sm font-black text-white shadow-lg shadow-paprika/20 transition hover:bg-cherry disabled:opacity-60"
                                >
                                    <Save size={16} />
                                    {savingId === block.id ? "Saving..." : "Save block"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => deleteBlock(block.id)}
                                    className="inline-flex items-center gap-2 rounded-full border border-paprika/20 bg-white px-5 py-3 text-sm font-black text-paprika transition hover:bg-paprika hover:text-white"
                                >
                                    <Trash2 size={16} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-2xl font-black text-dark">{block.title}</h2>
                            <p className="mt-3 whitespace-pre-line leading-7 text-dark/60">
                                {block.body}
                            </p>
                        </>
                    )}
                </section>
            ))}

            {canEdit && (
                <button
                    type="button"
                    onClick={addBlock}
                    disabled={isAdding}
                    className="inline-flex items-center gap-2 rounded-full bg-paprika px-6 py-3 text-sm font-black text-white shadow-lg shadow-paprika/20 transition hover:bg-cherry disabled:opacity-60"
                >
                    <Plus size={17} />
                    {isAdding ? "Adding..." : "Add block"}
                </button>
            )}
        </div>
    );
}