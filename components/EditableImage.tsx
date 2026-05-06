"use client";

import Image from "next/image";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";

type EditableImageProps = {
    src: string;
    alt: string;
    imageKey: string;
    locale: string;
    page: string;
    canEdit?: boolean;

    className?: string;
    imageClassName?: string;

    width?: number;
    height?: number;
    fill?: boolean;
    priority?: boolean;
    sizes?: string;

    placeholderTitle?: string;
    placeholderDescription?: string;
};

export function EditableImage({
                                  src,
                                  alt,
                                  imageKey,
                                  locale,
                                  page,
                                  canEdit = false,

                                  className = "",
                                  imageClassName = "",

                                  width = 900,
                                  height = 650,
                                  fill = false,
                                  priority = false,
                                  sizes,

                                  placeholderTitle = "Add photo",
                                  placeholderDescription = "Recommended: horizontal image, 1200×850 px or 1600×1100 px.",
                              }: EditableImageProps) {
    const [imageSrc, setImageSrc] = useState(src || "");
    const [uploading, setUploading] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageSrc(src || "");
        setImageError(false);
    }, [src]);

    const hasImage =
        imageSrc.trim() !== "" &&
        !imageSrc.includes("undefined") &&
        !imageSrc.includes("null") &&
        !imageError;

    async function uploadImage(file: File) {
        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("key", imageKey);
            formData.append("locale", locale);
            formData.append("page", page);

            const response = await fetch("/api/admin/site-image", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.url) {
                alert(data.error || "Could not upload image");
                return;
            }

            setImageSrc(data.url);
            setImageError(false);
        } catch {
            alert("Could not upload image");
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className={`group relative ${className}`}>
            {hasImage ? (
                fill ? (
                    <Image
                        src={imageSrc}
                        alt={alt}
                        fill
                        priority={priority}
                        sizes={sizes}
                        className={imageClassName}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <Image
                        src={imageSrc}
                        alt={alt}
                        width={width}
                        height={height}
                        priority={priority}
                        sizes={sizes}
                        className={imageClassName}
                        onError={() => setImageError(true)}
                    />
                )
            ) : (
                <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-[1.5rem] bg-white text-center">
                    {canEdit ? (
                        <div className="max-w-sm px-6 text-sm leading-6 text-dark/50">
                            <ImagePlus className="mx-auto mb-3 text-paprika/50" size={30} />

                            <p className="mb-2 font-black text-dark">{placeholderTitle}</p>

                            <p>{placeholderDescription}</p>

                            <p className="mt-2">JPG / PNG / WebP</p>
                        </div>
                    ) : (
                        <span className="sr-only">Image not available</span>
                    )}
                </div>
            )}

            {canEdit && (
                <label className="absolute right-4 top-4 z-20 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-paprika shadow-md ring-1 ring-dark/10 transition hover:bg-paprika hover:text-white">
                    <ImagePlus size={15} />
                    {uploading ? "Uploading..." : "Change photo"}

                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                            const file = event.target.files?.[0];

                            if (file) {
                                uploadImage(file);
                            }

                            event.currentTarget.value = "";
                        }}
                    />
                </label>
            )}
        </div>
    );
}