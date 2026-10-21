import "server-only";
import { apiRequest } from "@/lib/api/http-client";
import { ApiError } from "@/lib/api/api-error";

export type Invitation = {
  organization: { name: string };
  owner: { name: string; email: string };
  roleName: string;
  requiresPasswordSetup: boolean;
};

export function validToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function getInvitation(token: string): Promise<Invitation> {
  const result = await apiRequest<{ data: Invitation }>(
    `/onboarding/invitations/${encodeURIComponent(token)}`,
    { cache: "no-store", signal: AbortSignal.timeout(15000) },
  );
  const data = result.data;
  if (
    !data ||
    typeof data.requiresPasswordSetup !== "boolean" ||
    typeof data.organization?.name !== "string" ||
    typeof data.owner?.email !== "string" ||
    typeof data.owner?.name !== "string" ||
    typeof data.roleName !== "string"
  ) {
    throw new Error("Invalid invitation response");
  }
  return data;
}

export function invitationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404)
      return "This invitation could not be found. Ask your administrator for a new invitation.";
    if (error.status === 410)
      return "This invitation has expired or been revoked. Ask your administrator for a new invitation.";
    if (error.status === 400 || error.status === 409)
      return "This invitation is no longer available. If you already activated your account, sign in to the app; otherwise ask your administrator for help.";
    if (error.status === 429)
      return "Too many attempts. Please wait a moment before trying again.";
  }
  return "We couldn’t complete this request. Please try again. If you already submitted activation, try signing in to the app first.";
}
