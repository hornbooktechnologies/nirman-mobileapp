import { Redirect } from "expo-router";

import { SalesBookingScreen } from "../../src/features/sales/sales-booking-screen";
import { getActiveProjectPermissions } from "../../src/lib/auth";
import { useSession } from "../../src/providers";

export default function SalesBookingRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);
  const canRead = permissions.some(
    (permission) =>
      permission === "leads:read-own" ||
      permission === "leads:read-team" ||
      permission === "leads:read-all",
  );
  if (!canRead) return <Redirect href="/(app)/dashboard" />;
  return <SalesBookingScreen />;
}
