"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/features/profile/services/profile.service";

export const profileKeys = {
  me: ["profile", "me"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.me,
    queryFn: profileService.getProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileService.updateProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: profileService.changePassword,
  });
}
