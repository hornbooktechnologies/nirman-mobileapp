"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui";
import { ApiError } from "@/lib/api/api-client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLogin } from "@/features/auth/hooks/use-login";
import { brandAssets } from "@/theme";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const { setSession } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const session = await login.mutateAsync(values);
      setSession(session);
      router.replace("/dashboard");
    } catch (error) {
      form.setError("root", {
        message: error instanceof ApiError ? error.message : "Unable to login",
      });
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-[420px]">
        <CardHeader className="items-center text-center">
          <Image
            src={brandAssets.logoFull}
            alt="NirmanSite"
            width={220}
            height={80}
            className="mb-3 h-auto w-[220px] max-w-full object-contain"
            priority
          />
          <CardTitle>Sign in to your workspace</CardTitle>
          {searchParams.get("passwordChanged") === "1" ? (
            <p className="rounded-inner border border-success/25 bg-success/5 px-3 py-2 text-[12px] font-medium text-success" role="status">Password changed. Sign in again with your new password.</p>
          ) : null}
          <p className="max-w-[300px] text-[13px] leading-5 text-sub">
            {searchParams.get("activated") === "1"
              ? "Your organization access is active. Sign in with your account password."
              : "Builder operations, site execution, and approvals in one calm back-office portal."}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label className="text-[12px] font-semibold text-body">Email</label>
              <Input
                type="email"
                placeholder="admin@example.local"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-[12px] text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-[12px] font-semibold text-body">Password</label>
                <Link className="text-[12px] font-semibold text-lime hover:text-lime-sub" href="/forgot-password">Forgot password?</Link>
              </div>
              <Input type="password" {...form.register("password")} />
              {form.formState.errors.password ? (
                <p className="text-[12px] text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            {form.formState.errors.root ? (
              <p className="text-[12px] text-red-600">{form.formState.errors.root.message}</p>
            ) : null}
            <Button type="submit" variant="primary" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in" : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <LoginPageContent />
    </Suspense>
  );
}
