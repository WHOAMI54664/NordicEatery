"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Camera, Save, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

type AccountProfileFormProps = {
    userId: string;
    initialFullName: string | null;
    initialAvatarUrl: string | null;
};

export function AccountProfileForm({
                                       userId,
                                       initialFullName,
                                       initialAvatarUrl
                                   }: AccountProfileFormProps) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [fullName, setFullName] = useState(initialFullName || "");
    const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    async function uploadAvatar(file: File) {
        setIsUploading(true);
        setErrorMessage("");
        setSuccessMessage("");

        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${fileExt}`;

        const filePath = `${userId}/${fileName}`;

        const { error } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: true
            });

        if (error) {
            setErrorMessage(error.message);
            setIsUploading(false);
            return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);

        setAvatarUrl(data.publicUrl);
        setIsUploading(false);
        setSuccessMessage("Photo uploaded. Save changes to update your profile.");
    }

    async function saveProfile() {
        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        const { error } = await supabase
            .from("profiles")
            .update({
                full_name: fullName.trim() || null,
                avatar_url: avatarUrl || null
            })
            .eq("id", userId);

        setIsSaving(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccessMessage("Profile updated successfully.");
        router.refresh();
    }

    return (
        <section className="rounded-[2rem] border border-[#EADDCF] bg-[#FFFCF6]/88 p-5 shadow-xl shadow-[#4C2314]/8 backdrop-blur-2xl lg:p-6">
            <div className="mb-6 border-b border-[#EADDCF] pb-5">
                <h2 className="text-xl font-black tracking-[-0.03em] text-[#25120F]">
                    Profile settings
                </h2>
                <p className="mt-1 text-sm font-medium text-[#7B6A61]">
                    Change your display name and profile photo.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
                <div className="rounded-[1.75rem] border border-[#EADDCF] bg-white/70 p-5">
                    <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-[2rem] border border-[#EADDCF] bg-[#FFF7EA]">
                        {avatarUrl ? (
                            <Image
                                src={avatarUrl}
                                alt={fullName || "Profile photo"}
                                fill
                                sizes="160px"
                                className="object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <UserRound className="h-16 w-16 text-[#C7192E]" />
                            </div>
                        )}
                    </div>

                    <label className="mt-5 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 text-sm font-black text-[#C7192E] transition hover:bg-[#E51B23]/12">
                        <Camera className="h-4 w-4" />
                        {isUploading ? "Uploading..." : "Upload photo"}
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            disabled={isUploading}
                            className="hidden"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) uploadAvatar(file);
                            }}
                        />
                    </label>
                </div>

                <div className="space-y-5">
                    <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-[#A39388]">
              Full name
            </span>
                        <input
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            placeholder="Your name"
                            className="h-12 w-full rounded-2xl border border-[#EADDCF] bg-white/75 px-4 text-sm font-semibold text-[#25120F] outline-none shadow-inner shadow-[#4C2314]/5 transition placeholder:text-[#A39388] focus:border-[#E51B23]/25 focus:bg-white focus:ring-4 focus:ring-[#E51B23]/8"
                        />
                    </label>

                    {successMessage ? (
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-700">
                            {successMessage}
                        </div>
                    ) : null}

                    {errorMessage ? (
                        <div className="rounded-2xl border border-[#E51B23]/15 bg-[#E51B23]/8 px-4 py-3 text-sm font-bold text-[#C7192E]">
                            {errorMessage}
                        </div>
                    ) : null}

                    <button
                        type="button"
                        disabled={isSaving || isUploading}
                        onClick={saveProfile}
                        className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#E51B23] px-6 text-sm font-black text-white shadow-lg shadow-[#E51B23]/20 transition hover:bg-[#C7192E] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {isSaving ? "Saving..." : "Save profile"}
                    </button>
                </div>
            </div>
        </section>
    );
}