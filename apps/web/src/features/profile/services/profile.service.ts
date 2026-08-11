import { api } from "@/lib/api/api-client";
import type {
  ChangePasswordInput,
  Profile,
  UpdateProfileInput,
} from "@/features/profile/types/profile.types";

export const profileService = {
  getProfile() {
    return api.get<Profile>("/users/me");
  },
  updateProfile(input: UpdateProfileInput) {
    return api.patch<Profile, UpdateProfileInput>("/users/me", input);
  },
  changePassword(input: ChangePasswordInput) {
    return api.patch<null, ChangePasswordInput>("/users/me/password", input);
  },
};
