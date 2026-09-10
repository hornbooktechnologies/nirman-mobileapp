const fs=require('fs');
const screen='apps/mobile/src/features/home/customer-screens.tsx';
let s=fs.readFileSync(screen,'utf8');
fs.writeFileSync('.tmp/dashboard-screen-before.tsx',s);
s=s.replace('DashboardActionKey, RoleDashboardResponse','DashboardActionKey, GalleryEntry, RoleDashboardResponse');
s=s.replace("import { Alert, Image,", "import { Alert, Animated, Image,");
for(const name of ['DashboardInsightPanel','ProjectProgressCard','ProjectSummaryStrip','RecentSiteActivityCard','TodayAtSiteCard'])s=s.replace('  '+name+',\n','');
s=s.replace("import { fetchRoleDashboard }", "import { ActivityTimeline, DashboardBackdrop, DashboardTabs, Entrance, ProgressCard, ProjectSummary, QuickActions, SalesPulse, SiteStatsCard } from './components/Dashboard';\nimport { fetchGalleryEntries } from '../gallery/services';\nimport { AuthenticatedGalleryImage } from '../gallery/authenticated-gallery-image';\nimport { fetchRoleDashboard }");
s=s.replace("  const { t: tProgress } = useTranslation('progress');", "  const { t: tProgress } = useTranslation('progress');\n  const { t: tGallery } = useTranslation('gallery');\n  const scrollY = useRef(new Animated.Value(0)).current;\n  const [projectLocation, setProjectLocation] = useState('');\n  const [activityEntries, setActivityEntries] = useState<GalleryEntry[]>([]);\n  const [activityLoading, setActivityLoading] = useState(false);\n  const [activityFailed, setActivityFailed] = useState(false);");
s=s.replace('    setLoadingDashboard(true);','    setLoadingDashboard(true);\n    setDashboard(null);');
const marker='  const number = (value: number)';
const effects=`  useEffect(() => {
    let current = true;
    setProjectLocation('');
    if (activeProject && session?.activeOrganization && session.accessToken) {
      void fetchProject(session.activeOrganization.id, activeProject.id, session.accessToken)
        .then(project => { if (current) setProjectLocation([project.address.city, project.address.state].filter(Boolean).join(', ')); })
        .catch(() => undefined);
    }
    return () => { current = false; };
  }, [activeProject?.id, session?.activeOrganization?.id, session?.accessToken]);

  useEffect(() => {
    let current = true;
    setActivityEntries([]);
    setActivityFailed(false);
    setActivityLoading(false);
    if (dashboard?.gallery && dashboard.project.id === activeProject?.id && session?.activeOrganization && session.accessToken) {
      setActivityLoading(true);
      void fetchGalleryEntries(session.activeOrganization.id, activeProject.id, session.accessToken, { page: 1, pageSize: 3 })
        .then(result => { if (current) setActivityEntries(result.items); })
        .catch(() => { if (current) setActivityFailed(true); })
        .finally(() => { if (current) setActivityLoading(false); });
    }
    return () => { current = false; };
  }, [dashboard, activeProject?.id, session?.activeOrganization?.id, session?.accessToken]);

`;
s=s.replace(marker,effects+marker);
s=s.replace("{ accessibilityLabel: tHome('finance.expensesA11y'", "{ key: 'expenses', accessibilityLabel: tHome('finance.expensesA11y'");
s=s.replace("{ accessibilityLabel: tHome('finance.kharchiA11y'", "{ key: 'kharchi', accessibilityLabel: tHome('finance.kharchiA11y'");
s=s.replace("{ accessibilityLabel: tHome('finance.wageEstimateA11y'", "{ key: 'wages', accessibilityLabel: tHome('finance.wageEstimateA11y'");
s=s.replace('  const progressStages: Array<{ label: string; percentage: number }> = [];\n','');
s=s.replace('style={styles.homeContent} variant="dashboard"','style={styles.homeContent} variant="dashboard" scrollY={scrollY}');
s=s.replace('      <ProjectContextCard\n        featured','      <DashboardBackdrop>\n      <Entrance>\n      <ProjectContextCard\n        featured\n        location={projectLocation}\n        scrollY={scrollY}');
s=s.replace('      <ProjectSummaryStrip items={[','      </Entrance>\n      <ProjectSummary items={[');
s=s.replace("count: availableProjects.length }), icon: 'office-building-marker-outline', label: tHome('metrics.workingSites'), tone: 'brand', value: availableProjects.length", "count: availableProjects.filter(project => project.status === 'ACTIVE').length }), icon: 'office-building-marker-outline', label: tHome('metrics.workingSites'), tone: 'brand', value: availableProjects.filter(project => project.status === 'ACTIVE').length");
s=s.replace('<ProjectProgressCard','<ProgressCard').replace('          stages={progressStages}\n','');
s=s.replace('<TodayAtSiteCard','<SiteStatsCard').replace('          artwork={false}\n','');
s=s.replace("{dashboard?.sales ? <SiteStatsCard artwork={false}","{dashboard?.sales ? <SalesPulse");
// Preserve nullable permission-restricted metrics instead of displaying invented zeros.
for(const field of ['assignedWorkers','presentToday','absentToday']) {
  const names={assignedWorkers:'workers',presentToday:'present',absentToday:'absent'};
  const re=new RegExp("            \\{ accessibilityLabel: tHome\\('today\\."+names[field]+"A11y'[^\\n]+",'g');
  s=s.replace(re,line=>"            ...(dashboard.site."+field+" !== null ? ["+line.trim().replace(/,$/,'')+"] : []),");
}
const primaryActions=`      {quickActions.length ? <QuickActions title={tHome('quickActions.title')} items={[
        ...quickActions.filter(action => action.key === 'create-project'),
        ...(roleQuickActions.some(action => action.key === 'MARK_ATTENDANCE' || action.key === 'UPDATE_PROGRESS')
          ? roleQuickActions.filter(action => action.key === 'MARK_ATTENDANCE' || action.key === 'UPDATE_PROGRESS')
          : quickActions.filter(action => action.key !== 'create-project' && action.key !== 'more').slice(0, 2)),
        ...quickActions.filter(action => action.key === 'more'),
      ].map(action => ({ ...action, label: action.key === 'create-project' ? tHome('dashboard.create') : action.key === 'MARK_ATTENDANCE' ? tHome('dashboard.attendance') : action.key === 'UPDATE_PROGRESS' ? tHome('dashboard.progress') : action.label }))} /> : null}

`;
s=s.replace('      {activeProject && (dashboard?.finance',primaryActions+'      {activeProject && (dashboard?.finance');
s=s.replace('<DashboardInsightPanel','<DashboardTabs');
const begin=s.indexOf('      {activeProject && dashboard?.gallery ? (');
const end=s.indexOf('      {dashboardFailed ? (',begin);
s=s.slice(0,begin)+`      {activeProject && dashboard?.gallery ? (
        <ActivityTimeline
          title={tHome('activity.title')}
          emptyLabel={tHome('activity.empty')}
          viewAllLabel={tHome('activity.viewAll')}
          onViewAll={() => router.push('/(app)/gallery')}
          loadingLabel={activityLoading ? tHome('data.loading') : activityFailed ? tHome('data.unavailable') : undefined}
          items={activityEntries.filter(entry => entry.projectId === activeProject.id && entry.organizationId === session?.activeOrganization?.id).map(entry => ({
            id: entry.id,
            title: entry.caption || tGallery(\x60category.\x24{entry.category}\x60),
            date: formatDate(entry.capturedAt, language, { dateStyle: 'medium', timeStyle: 'short' }),
            status: tGallery(\x60status.\x24{entry.status}\x60),
            statusTone: entry.status === 'APPROVED' ? 'success' as const : entry.status === 'REJECTED' ? 'danger' as const : 'warning' as const,
            thumbnail: session?.accessToken ? <AuthenticatedGalleryImage compact entry={entry} token={session.accessToken} accessibilityLabel={tGallery('card.photoA11y', { category: tGallery(\x60category.\x24{entry.category}\x60) })} style={{ width: 60, height: 60 }} /> : undefined,
            onPress: () => router.push('/(app)/gallery'),
          }))}
        />
      ) : null}

`+s.slice(end);
s=s.replace('      {showCreateProject && session?.activeOrganization ? (','      </DashboardBackdrop>\n\n      {showCreateProject && session?.activeOrganization ? (');
fs.writeFileSync(screen,s);

const switcher='apps/mobile/src/features/projects/components/project-switcher.tsx';
s=fs.readFileSync(switcher,'utf8');
s=s.replace("import { Image, Pressable,", "import { Animated, Image, Pressable,");
s=s.replace("const FEATURED_PROJECT_ART", "import { ProjectHero } from '../../home/components/Dashboard/ProjectHero';\n\nconst FEATURED_PROJECT_ART");
s=s.replace('  compact?: boolean;','  location?: string;\n  scrollY?: Animated.Value;\n  compact?: boolean;');
s=s.replace('export function ProjectContextCard({ compact', 'export function ProjectContextCard({ location, scrollY, compact');
const heroStart=s.indexOf('        <GlassCard variant="strong" style={styles.featuredCard}>');
const heroEnd=s.indexOf('        <ProjectSwitcherSheet',heroStart);
s=s.slice(0,heroStart)+`        <ProjectHero
          projectName={projectName}
          selectedLabel={activeProject ? t('projectContext.selectedProject') : t('projectContext.projectContext')}
          location={location}
          tagline={t('dashboard.tagline')}
          switchLabel={t('projectContext.switch')}
          switchAccessibilityLabel={t('projectContext.switchProject')}
          openLabel={t('projectContext.openProject')}
          openAccessibilityLabel={t('projectContext.openNamedProject', { project: activeProject?.name ?? projectName })}
          onSwitch={canSwitch ? () => setIsOpen(true) : undefined}
          onOpen={activeProject ? onOpenProject : undefined}
          scrollY={scrollY}
        />

`+s.slice(heroEnd);
fs.writeFileSync(switcher,s);

const shell='apps/mobile/src/components/ui/nirman-screen-background.tsx';
s=fs.readFileSync(shell,'utf8');
s=s.replace('  ScrollView,','  Animated,');
s=s.replace('  footer?: ReactNode;','  footer?: ReactNode;\n  scrollY?: Animated.Value;');
s=s.replace('  footer,\n','  footer,\n  scrollY,\n');
s=s.replace('<ScrollView\n','<Animated.ScrollView\n            onScroll={scrollY ? Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }) : undefined}\n            scrollEventThrottle={scrollY ? 16 : undefined}\n');
s=s.replace('</ScrollView>','</Animated.ScrollView>');
fs.writeFileSync(shell,s);

const copy={en:{tagline:'Plan | Build | Progress | Together',create:'Create',attendance:'Attendance',progress:'Progress'},hi:{tagline:'योजना | निर्माण | प्रगति | साथ',create:'बनाएँ',attendance:'हाज़िरी',progress:'प्रगति'},gu:{tagline:'આયોજન | બાંધકામ | પ્રગતિ | સાથે',create:'બનાવો',attendance:'હાજરી',progress:'પ્રગતિ'}};
for(const language of ['en','hi','gu']) {
 const file='apps/mobile/src/i18n/locales/'+language+'/home.json';
 const data=JSON.parse(fs.readFileSync(file,'utf8'));data.dashboard=copy[language];fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
}
