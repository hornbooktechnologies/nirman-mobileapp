import { Redirect } from "expo-router";
import { BrochuresScreen } from "../../src/features/brochures/brochures-screen";
import { getActiveProjectPermissions } from "../../src/lib/auth";
import { useSession } from "../../src/providers";
export default function BrochuresRoute() {
  const { session } = useSession();
  return getActiveProjectPermissions(session).includes("brochures:read") ? (
    <BrochuresScreen />
  ) : (
    <Redirect href="/(app)/dashboard" />
  );
}
