"use client";

import { useMutation } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";

export function useLogin() {
  return useMutation({
    mutationFn: authService.login,
  });
}
