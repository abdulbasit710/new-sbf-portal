"use client";

import { useRef, useState } from "react";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ProfileAvatar, { notifyProfileImageUpdated, profileImageKey, useProfileImage } from "@/components/profile/ProfileAvatar";
import { useSession } from "@/lib/session";

const MAX_FILE_SIZE = 6 * 1024 * 1024;

async function imageFileToSquareDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image is too large. Use an image under 6MB.");
  }

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read this image."));
      img.src = sourceUrl;
    });

    const size = 640;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Image processing is not supported in this browser.");

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - sourceSize) / 2;
    const sy = (image.naturalHeight - sourceSize) / 2;

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

    return canvas.toDataURL("image/jpeg", 0.86);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function ProfileImageManager() {
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const imageUrl = useProfileImage(session?.email);

  const handleFile = async (file?: File) => {
    if (!file || !session?.email) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const dataUrl = await imageFileToSquareDataUrl(file);
      localStorage.setItem(profileImageKey(session.email), dataUrl);
      notifyProfileImageUpdated(session.email);
      setMessage("Profile image saved. The top-right portal badge has been updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile image.");
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = () => {
    if (!session?.email) return;
    localStorage.removeItem(profileImageKey(session.email));
    notifyProfileImageUpdated(session.email);
    setMessage("Profile image removed. Initials will show again.");
    setError("");
  };

  return (
    <Card className="overflow-hidden border-gold/15">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-gold/[0.12] via-white/[0.025] to-black/20 p-6 lg:border-b-0 lg:border-r">
          <div className="absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
          <div className="relative flex items-center gap-5">
            <ProfileAvatar
              email={session?.email}
              name={session?.name}
              className="h-24 w-24 rounded-2xl"
              textClassName="text-2xl"
            />
            <div>
              <div className="label-mono text-gold">Profile Image</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-chalk">
                {session?.name ?? "Portal user"}
              </h2>
              <p className="mt-1 text-sm text-muted">{session?.email ?? "No active email"}</p>
              <p className="mt-3 max-w-md text-sm leading-6 text-chalk/70">
                Upload a partner image here. It will appear in the top-right account badge and dropdown menu for this logged-in profile.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <CardHeader
            title="Upload portal photo"
            sub="Square images work best. The app crops and compresses the image before saving it locally for this profile."
          />

          <div className="mt-5 rounded-2xl border border-dashed border-gold/25 bg-gold/[0.035] p-5">
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-chalk">Partner display image</div>
                <p className="mt-1 text-xs leading-5 text-muted">
                  JPG, PNG, WEBP, or GIF. Maximum 6MB. Stored per email profile in the browser.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => inputRef.current?.click()} disabled={saving}>
                  {saving ? "Saving..." : imageUrl ? "Change Image" : "Upload Image"}
                </Button>
                {imageUrl && (
                  <Button type="button" variant="outline" onClick={removeImage} disabled={saving}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          {message && <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</div>}
          {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">Visible in</div>
              <div className="mt-1 text-sm text-chalk">Top-right badge</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">Profile key</div>
              <div className="mt-1 truncate text-sm text-chalk">{session?.email ?? "guest"}</div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
              <div className="label-mono text-muted">Storage</div>
              <div className="mt-1 text-sm text-chalk">Browser local</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
