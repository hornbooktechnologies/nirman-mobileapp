"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { apiClient } from "@/lib/api/api-client";
import { profileKeys } from "../hooks/use-profile";
import { UserAvatar } from "./user-avatar";

export function ProfilePhotoEditor({ avatar }: { avatar: string | null }) {
  const { refreshUser } = useAuth();
  const cache = useQueryClient();
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function save(file?: File) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (file) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error("Choose a JPEG, PNG or WebP image up to 5 MB.");
        const form = new FormData();
        form.append("file", file, file.name);
        await apiClient.post("/users/me/avatar", form, {
          headers: { "Content-Type": undefined },
        });
      } else await apiClient.delete("/users/me/avatar");
      await Promise.all([
        refreshUser(),
        cache.invalidateQueries({ queryKey: profileKeys.me }),
        cache.invalidateQueries({ queryKey: ["profile-avatar"] }),
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update profile photo.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
      if (picker.current) picker.current.value = "";
    }
  }
  return (
    <div className="mb-5 space-y-3 border-b border-hairline pb-5">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy}
          aria-label="Change profile photo"
          onClick={() => picker.current?.click()}
        >
          <UserAvatar avatar={avatar} />
        </button>
        <Button
          type="button"
          disabled={busy}
          onClick={() => picker.current?.click()}
        >
          {busy ? "Saving photo…" : "Change photo"}
        </Button>
        {avatar && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void save()}
          >
            Remove photo
          </Button>
        )}
      </div>
      <input
        ref={picker}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Choose profile photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void save(file);
        }}
      />
      <p className="text-sm text-sub">JPEG, PNG or WebP, up to 5 MB.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
