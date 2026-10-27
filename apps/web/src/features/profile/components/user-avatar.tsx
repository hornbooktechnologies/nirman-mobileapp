"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { UserCircle } from "lucide-react";
import { apiClient } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function UserAvatar({
  avatar,
  className = "h-16 w-16",
}: {
  avatar?: string | null;
  className?: string;
}) {
  const { user } = useAuth();
  const owned = avatar?.startsWith("profile-photos/");
  const image = useQuery({
    queryKey: ["profile-avatar", user?.id, avatar],
    enabled: Boolean(owned && user),
    queryFn: async ({ signal }) =>
      (
        await apiClient.get<Blob>("/users/me/avatar", {
          responseType: "blob",
          signal,
        })
      ).data,
    staleTime: 300000,
  });
  const [object, setObject] = useState<{ key: string; url: string } | null>(
    null,
  );
  useEffect(() => {
    if (!image.data || !avatar) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setObject({ key: avatar, url: reader.result });
    };
    reader.readAsDataURL(image.data);
    return () => {
      reader.onload = null;
      if (reader.readyState === FileReader.LOADING) reader.abort();
    };
  }, [image.data, avatar]);
  const src = owned
    ? image.data && object && object.key === avatar
      ? object.url
      : undefined
    : avatar || undefined;
  return src ? (
    <Image
      src={src}
      width={64}
      height={64}
      unoptimized
      alt="Profile photo"
      className={`${className} rounded-full object-cover`}
    />
  ) : (
    <UserCircle aria-label="Profile photo" className={className} />
  );
}
