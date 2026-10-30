import { Redirect, useLocalSearchParams } from "expo-router";

import { SalesBookingScreen } from "../../src/features/sales/sales-booking-screen";
import { getRouteProject } from "../../src/lib/auth";
import { useSession } from "../../src/providers";

export default function SalesBookingRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);
  const canRead = permissions.some(
    (permission) =>
      permission === "leads:read-own" ||
      permission === "leads:read-team" ||
      permission === "leads:read-all",
  );
  if (!canRead) return <Redirect href="/(app)/dashboard" />;
  return <SalesBookingScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}:${permissions.join(",")}:${project?.status}`} />;
}
