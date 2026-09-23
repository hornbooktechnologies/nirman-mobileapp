import type { SubscriptionStatus } from "@nirman-app/shared";

export function subscriptionTone(status: SubscriptionStatus) {
  switch (status) {
    case "ACTIVE": return "success" as const;
    case "PENDING": return "warning" as const;
    case "SUSPENDED": return "danger" as const;
    case "EXPIRED":
    case "CANCELLED": return "inactive" as const;
  }
}
