"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { authService } from "@/features/auth/services/auth.service";
import { ApiError } from "@/lib/api/api-client";
import { brandAssets } from "@/theme";

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setError("");
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Unable to request a reset link");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center text-center">
          <Image src={brandAssets.logoFull} alt="NirmanSite" width={220} height={80} className="mb-3 h-auto max-w-full object-contain" priority />
          <CardTitle>Reset your password</CardTitle>
          <p className="max-w-[320px] text-[13px] leading-5 text-sub">Enter your login email and we will send a secure, single-use reset link.</p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4" aria-live="polite">
              <div className="rounded-inner border border-success/25 bg-success/5 p-4 text-[13px] leading-5 text-body">If an active account exists for this email, password reset instructions have been sent.</div>
              <Link className="block text-center text-[13px] font-semibold text-lime hover:text-lime-sub" href={`/login?email=${encodeURIComponent(email.trim())}`}>Back to Login</Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submit}>
              <label className="block space-y-2">
                <span className="text-[12px] font-semibold text-body">Email</span>
                <Input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              {error ? <p className="text-[12px] text-danger" role="alert">{error}</p> : null}
              <Button className="w-full" size="lg" type="submit" disabled={working}>{working ? "Sending link" : "Send reset link"}</Button>
              <Link className="block text-center text-[13px] font-semibold text-lime hover:text-lime-sub" href={`/login?email=${encodeURIComponent(email.trim())}`}>Back to Login</Link>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen" />}><ForgotPasswordContent /></Suspense>;
}
