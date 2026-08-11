import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DashboardCard,
  FilterBar,
  Input,
  Radio,
  Select,
  StatsCard,
  StatusBadge,
  Textarea,
} from "@/components/ui";

export default function DesignSystemPage() {
  return (
    <div className="space-y-7">
      <Card className="border-white/60 bg-white/40 p-7 shadow-floating backdrop-blur-xl">
        <p className="text-[12px] font-bold uppercase tracking-[0.8px] text-lime">
          NirmanSite system
        </p>
        <h1 className="mt-2 text-[40px] font-bold leading-tight text-body">
          Premium glass foundation
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-sub">
          Web components share the same logo-derived olive and copper tokens as mobile while keeping a desktop admin layout.
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatsCard label="Active sites" value="12" detail="4 need attention" trend="Good" />
        <StatsCard label="Pending approvals" value="8" detail="Materials and kharchi" />
        <StatsCard label="Workers marked" value="146" detail="Across selected projects" />
      </div>

      <DashboardCard title="Controls" description="Buttons, form fields and tokens.">
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="dark">Dark</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <FilterBar>
            <Input placeholder="Search projects" />
            <Select defaultValue="active">
              <option value="active">Active</option>
              <option value="planning">Planning</option>
            </Select>
          </FilterBar>
          <Textarea placeholder="Site note" />
          <div className="flex flex-wrap gap-4">
            <Checkbox label="Offline ready" />
            <Radio name="mode" label="Builder review" defaultChecked />
          </div>
        </div>
      </DashboardCard>

      <Card>
        <CardHeader>
          <CardTitle>Status Language</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <StatusBadge tone="success">Approved</StatusBadge>
          <StatusBadge tone="warning">Pending</StatusBadge>
          <StatusBadge tone="danger">Rejected</StatusBadge>
          <StatusBadge tone="info">Synced</StatusBadge>
          <StatusBadge tone="purple">Planning</StatusBadge>
          <Badge variant="lime">Selected</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
