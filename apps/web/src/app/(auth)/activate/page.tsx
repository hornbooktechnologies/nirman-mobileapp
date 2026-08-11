"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { OrganizationOwnerInvitationPreview } from "@nirman-app/shared";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { authService } from "@/features/auth/services/auth.service";
import { ApiError } from "@/lib/api/api-client";

function ActivateInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const automaticAcceptanceStarted = useRef(false);
  const [invitation, setInvitation] = useState<OrganizationOwnerInvitationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(token));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : "The activation link is missing its invitation token.",
  );

  const continueToLogin = useCallback(
    (email: string) => {
      router.replace(`/login?email=${encodeURIComponent(email)}&activated=1`);
    },
    [router],
  );

  const activateExistingAccount = useCallback(
    async (loadedInvitation: OrganizationOwnerInvitationPreview) => {
      setError(null);
      setIsSubmitting(true);
      try {
        await authService.acceptInvitation(token);
        continueToLogin(loadedInvitation.owner.email);
      } finally {
        setIsSubmitting(false);
      }
    },
    [continueToLogin, token],
  );

  useEffect(() => {
    if (!token) return;

    authService
      .invitation(token)
      .then(async (loadedInvitation) => {
        setInvitation(loadedInvitation);
        if (
          !loadedInvitation.requiresPasswordSetup &&
          !automaticAcceptanceStarted.current
        ) {
          automaticAcceptanceStarted.current = true;
          await activateExistingAccount(loadedInvitation);
        }
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof ApiError
            ? loadError.message
            : "Unable to load this invitation",
        );
      })
      .finally(() => setIsLoading(false));
  }, [activateExistingAccount, token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation) return;
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.acceptInvitation(token, { password });
      continueToLogin(invitation.owner.email);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : "Unable to activate this account",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-[480px]">
        <CardHeader>
          <CardTitle>
            {invitation && !invitation.requiresPasswordSetup
              ? "Adding organization"
              : "Activate Owner account"}
          </CardTitle>
          {invitation ? (
            <p className="text-[13px] leading-5 text-sub">
              {invitation.owner.name}, you were invited as {invitation.roleName} for {" "}
              <span className="font-semibold text-body">
                {invitation.organization.name}
              </span>.
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-[13px] text-sub">Checking invitation</p> : null}
          {invitation && !invitation.requiresPasswordSetup ? (
            <div className="space-y-4">
              <p className="text-[13px] text-body">
                {isSubmitting
                  ? "Activating this organization for your existing account."
                  : "Your existing password is unchanged. Continue to Login to access this organization."}
              </p>
              {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
              {!isSubmitting ? (
                <Button
                  className="w-full"
                  onClick={() => {
                    void activateExistingAccount(invitation).catch((retryError) => {
                      setError(
                        retryError instanceof ApiError
                          ? retryError.message
                          : "Unable to activate this organization",
                      );
                    });
                  }}
                >
                  Retry Activation
                </Button>
              ) : null}
            </div>
          ) : invitation ? (
            <form className="space-y-4" onSubmit={submit}>
              <div className="rounded-inner border border-hairline bg-sunken/40 p-3 text-[12px] text-sub">
                Login email: <span className="font-semibold text-body">{invitation.owner.email}</span>
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-body">
                  Create password
                </label>
                <Input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-body">
                  Confirm password
                </label>
                <Input
                  type="password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Activating" : "Activate Account"}
              </Button>
            </form>
          ) : error ? (
            <div className="space-y-4">
              <p className="text-[13px] text-red-600">{error}</p>
              <Link className="text-[13px] font-semibold text-body underline" href="/login">
                Return to login
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ActivateInvitationPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <ActivateInvitationContent />
    </Suspense>
  );
}
