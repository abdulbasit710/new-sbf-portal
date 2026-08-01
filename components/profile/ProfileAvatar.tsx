"use client";

import { useEffect, useMemo, useState } from "react";

const PREFIX = "sbf-profile-image:";
const EVENT_NAME = "sbf-profile-image-updated";

export function profileImageKey(email?: string | null) {
  return `${PREFIX}${(email || "guest").trim().toLowerCase()}`;
}

export function initialsFromName(name?: string | null, email?: string | null) {
  const source = (name && name.trim()) || (email && email.split("@")[0]) || "Guest User";
  const parts = source
    .replace(/[._-]+/g, " ")
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "GU";
}

export function notifyProfileImageUpdated(email?: string | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: { email: (email || "guest").trim().toLowerCase() },
    }),
  );
}

export function useProfileImage(email?: string | null) {
  const [imageUrl, setImageUrl] = useState<string>("");
  const key = useMemo(() => profileImageKey(email), [email]);

  useEffect(() => {
    const read = () => {
      try {
        setImageUrl(localStorage.getItem(key) || "");
      } catch {
        setImageUrl("");
      }
    };

    read();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === key) read();
    };
    const onCustom = () => read();

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onCustom);
    };
  }, [key]);

  return imageUrl;
}

export default function ProfileAvatar({
  email,
  name,
  className = "h-8 w-8",
  textClassName = "text-xs",
}: {
  email?: string | null;
  name?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const imageUrl = useProfileImage(email);
  const initials = initialsFromName(name, email);

  return (
    <span
      className={`${className} relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-gold/20 bg-gold-grad font-semibold text-ink-950 shadow-glow-sm`}
      aria-label={name || email || "Profile avatar"}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name || email || "Profile"} className="h-full w-full object-cover" />
      ) : (
        <span className={textClassName}>{initials}</span>
      )}
    </span>
  );
}
