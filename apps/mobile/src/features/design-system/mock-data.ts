export const mobileTabs = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'work', label: 'Work', icon: 'account-group-outline' },
  { key: 'create', label: 'Create', icon: 'plus' },
  { key: 'updates', label: 'Updates', icon: 'message-outline' },
  { key: 'menu', label: 'Menu', icon: 'menu' },
] as const;

export const projects = [
  {
    title: 'Tower A',
    status: 'In Progress',
    progress: 72,
    icon: 'folder-cog-outline',
    selected: true,
  },
  {
    title: 'Villa Row',
    status: 'Planning',
    progress: 18,
    icon: 'home-city-outline',
    selected: false,
  },
  {
    title: 'Warehouse',
    status: 'On Hold',
    progress: 44,
    icon: 'package-variant-closed-check',
    selected: false,
  },
  {
    title: 'Staff Block',
    status: 'Not Started',
    progress: 0,
    icon: 'account-group-outline',
    selected: false,
  },
] as const;

export const detailActions = [
  { title: 'Project Context', subtitle: 'Selected', icon: 'folder-cog-outline', selected: true },
  { title: 'Access', subtitle: 'Resolved', icon: 'shield-check-outline', selected: false },
  { title: 'Profile', subtitle: 'Ready', icon: 'account-circle-outline', selected: false },
] as const;

export const detailRows = [
  { title: 'Organization', subtitle: 'Tenant context', value: 'Active', icon: 'office-building-outline' },
  { title: 'Project Access', subtitle: 'Field scope', value: 'Checked', icon: 'shield-account-outline' },
  { title: 'Session', subtitle: 'Secure storage', value: 'Saved', icon: 'cellphone-key' },
] as const;

export const workflowCards = [
  {
    title: 'Field Readiness',
    icon: 'clipboard-check-outline',
    metrics: ['Project Selected', 'Access Loaded', 'Session Saved'],
  },
  {
    title: 'Context Checks',
    icon: 'shield-check-outline',
    metrics: ['Organization Active', 'Membership Active', 'Permissions Ready', 'Field Scope'],
  },
] as const;

export const automationRows = [
  { title: 'Session Refresh', subtitle: 'Uses the current access token', icon: 'refresh' },
  { title: 'Project Switch', subtitle: 'Local choice from authorized projects', icon: 'swap-horizontal' },
  { title: 'Access Updates', subtitle: 'Recheck with the API before modules', icon: 'shield-sync-outline' },
] as const;

export const showcaseStatuses = ['In Progress', 'Planning', 'On Hold', 'Approved', 'Pending', 'Synced'] as const;
