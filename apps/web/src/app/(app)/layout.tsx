import { ProtectedDashboardShell } from "@/components/common/protected-dashboard-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedDashboardShell>{children}</ProtectedDashboardShell>;
}
