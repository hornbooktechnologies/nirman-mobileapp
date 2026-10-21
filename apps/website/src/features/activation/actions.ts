"use server";

import { apiRequest } from "@/lib/api/http-client";
import { getInvitation, invitationError, validToken } from "./service";

export type ActivationState = { success: boolean; error: string };

export async function activateAccount(
  token: string,
  _previous: ActivationState,
  form: FormData,
): Promise<ActivationState> {
  if (!validToken(token))
    return {
      success: false,
      error:
        "The invitation link is invalid. Please open the complete link from your email.",
    };
  try {
    // Always re-check API state; never trust a hidden field to decide password setup.
    const invitation = await getInvitation(token);
    const body: { password?: string } = {};
    if (invitation.requiresPasswordSetup) {
      const password = form.get("password");
      if (typeof password !== "string" || password.length < 8) {
        return {
          success: false,
          error: "Use a password with at least 8 characters.",
        };
      }
      if (password !== form.get("confirmPassword")) {
        return { success: false, error: "Passwords do not match." };
      }
      body.password = password;
    }
    await apiRequest(
      `/onboarding/invitations/${encodeURIComponent(token)}/accept`,
      {
        method: "POST",
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    return { success: true, error: "" };
  } catch (error) {
    return { success: false, error: invitationError(error) };
  }
}
