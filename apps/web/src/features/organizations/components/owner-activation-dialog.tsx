"use client";

import { Copy, ExternalLink, Share2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { OwnerActivationLinkResponse } from "@/features/organizations/types/organizations.types";

export function OwnerActivationDialog({
  open,
  activation,
  notice,
  onOpenChange,
}: {
  open: boolean;
  activation: OwnerActivationLinkResponse | null;
  notice?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [actionResult, setActionResult] = useState<{
    activationUrl: string;
    message: string;
  } | null>(null);

  async function copyActivationLink() {
    if (!activation) return;
    try {
      await navigator.clipboard.writeText(activation.invitation.activationUrl);
      setActionResult({
        activationUrl: activation.invitation.activationUrl,
        message: "Activation link copied.",
      });
    } catch {
      setActionResult({
        activationUrl: activation.invitation.activationUrl,
        message:
          "Unable to copy automatically. Select and copy the link above.",
      });
    }
  }

  async function shareActivationLink() {
    if (!activation) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: `Activate ${activation.organization.name} on NirmanSite`,
          text: "Use this secure link to activate your NirmanSite Owner account and create your password.",
          url: activation.invitation.activationUrl,
        });
        setActionResult({
          activationUrl: activation.invitation.activationUrl,
          message: "Share options opened.",
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
      }
    }
    await copyActivationLink();
  }

  return (
    <Dialog
      open={open && Boolean(activation)}
      title="Owner activation link ready"
      description={
        activation
          ? `${activation.organization.name} Owner activation.`
          : undefined
      }
      onOpenChange={onOpenChange}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              if (activation) {
                window.open(
                  activation.invitation.activationUrl,
                  "_blank",
                  "noopener,noreferrer",
                );
              }
            }}
          >
            <ExternalLink aria-hidden="true" size={16} />
            Open activation link
          </Button>
        </>
      }
    >
      {activation ? (
        <div className="space-y-4">
          <div
            className={`rounded-inner border p-3 ${
              activation.invitation.deliveryStatus === "EMAIL_SENT"
                ? "border-success/20 bg-success/5"
                : "border-warning/30 bg-warning/5"
            }`}
          >
            <p className="font-semibold">
              {activation.invitation.deliveryStatus === "EMAIL_SENT"
                ? "Activation email sent"
                : "Manual activation link"}
            </p>
            <p className="mt-1 text-sub">
              {activation.invitation.deliveryStatus === "EMAIL_SENT"
                ? "You can still copy or share this link as a fallback."
                : "Open the link to assist the Owner, or share it securely so they can create their password."}
            </p>
          </div>
          {notice ? (
            <p role="status" className="rounded-inner bg-sunken p-3 text-sub">
              {notice}
            </p>
          ) : null}
          <div>
            <p className="mb-1 font-medium">Web activation link</p>
            <p className="select-all break-all rounded-inner border border-hairline bg-sunken p-3 text-[12px] text-body">
              {activation.invitation.activationUrl}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void copyActivationLink()}>
              <Copy aria-hidden="true" size={16} />
              Copy link
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void shareActivationLink()}
            >
              <Share2 aria-hidden="true" size={16} />
              Share link
            </Button>
          </div>
          {actionResult?.activationUrl ===
          activation.invitation.activationUrl ? (
            <p role="status" className="rounded-inner bg-sunken p-3 text-sub">
              {actionResult.message}
            </p>
          ) : null}
          <p className="text-[12px] text-sub">
            Expires{" "}
            {new Date(activation.invitation.expiresAt).toLocaleString("en-IN")}.
            Share this private link only with the intended Owner; no password is
            included.
          </p>
        </div>
      ) : null}
    </Dialog>
  );
}
