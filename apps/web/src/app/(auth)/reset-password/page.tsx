"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { authService } from "@/features/auth/services/auth.service";
import { ApiError } from "@/lib/api/api-client";
import { brandAssets } from "@/theme";

function ResetPasswordContent() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return setError("This reset link is missing or invalid. Request a new link.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setWorking(true);
    setError("");
    try {
      await authService.resetPassword({ token, newPassword: password });
      setCompleted(true);
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      setError(resetError instanceof ApiError ? resetError.message : "Unable to reset your password");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center text-center">
          <Image src={brandAssets.logoFull} alt="NirmanSite" width={220} height={80} className="mb-3 h-auto max-w-full object-contain" priority />
          <CardTitle>Create a new password</CardTitle>
          <p className="max-w-[320px] text-[13px] leading-5 text-sub">Choose a new password for your NirmanSite account.</p>
        </CardHeader>
        <CardContent>
          {completed ? (
            <div className="space-y-4" aria-live="polite">
              <div className="rounded-inner border border-success/25 bg-success/5 p-4 text-[13px] leading-5 text-body">Your password has been reset. Sign in with your new password.</div>
              <Link className="block min-h-10 rounded-inner-lg bg-lime px-5 py-2.5 text-center text-[13px] font-semibold leading-5 text-lime-ink shadow-copper hover:bg-lime-sub" href="/login">Go to Login</Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block space-y-2">
                <span className="text-[12px] font-semibold text-body">New password</span>
                <Input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label className="block space-y-2">
                <span className="text-[12px] font-semibold text-body">Confirm password</span>
                <Input required minLength={8} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </label>
              {error ? <p className="text-[12px] text-danger" role="alert">{error}</p> : null}
              <Button className="w-full" size="lg" type="submit" disabled={working || !token}>{working ? "Resetting password" : "Reset password"}</Button>
              {!token ? <Link className="block text-center text-[13px] font-semibold text-lime hover:text-lime-sub" href="/forgot-password">Request a new link</Link> : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><ResetPasswordContent /></Suspense>;
}
