const fs=require('fs'),cp=require('child_process');
const path='apps/mobile/src/features/home/customer-screens.tsx';let s=fs.readFileSync(path,'utf8');
s=s.replace('const [dashboard, setDashboard] = useState<RoleDashboardResponse | null>(null);','const [dashboardResponse, setDashboard] = useState<RoleDashboardResponse | null>(null);');
s=s.replace('  const activeProject = getActiveProject(session);','  const activeProject = getActiveProject(session);\n  const dashboard = dashboardResponse?.project.id === activeProject?.id && dashboardResponse?.organizationId === session?.activeOrganization?.id ? dashboardResponse : null;');
// Only the dashboard component owns dashboardResponse (the file also contains other screens).
const first=s.indexOf('  const dashboard = dashboardResponse');let rest=s.slice(first+1).replace(/\n  const dashboard = dashboardResponse[^\n]+/g,'');s=s.slice(0,first+1)+rest;
for(const key of ['workers','present','absent','spend'])s=s.replace("{ accessibilityLabel: tHome('today."+key+"A11y'", "{ key: '"+key+"', accessibilityLabel: tHome('today."+key+"A11y'");
const start=s.indexOf('      {dashboard?.sales ? <SalesPulse');const end=s.indexOf('      {quickActions.length ?',start);
s=s.slice(0,start)+`      {dashboard?.sales ? <SalesPulse title={tHome('role.salesPulse')} stats={[
        { key: 'pipeline', label: tHome('role.metrics.pipeline'), raw: dashboard.sales.activePipeline },
        { key: 'overdueFollowUps', label: tHome('role.metrics.overdueFollowUps'), raw: dashboard.sales.overdueFollowUps },
        { key: 'expiringBlocks', label: tHome('role.metrics.expiringBlocks'), raw: dashboard.sales.blocksNearingExpiry },
        { key: 'bookedUnits', label: tHome('role.metrics.bookedUnits'), raw: dashboard.sales.bookedUnits },
      ].filter(metric => metric.raw !== null).map(metric => ({ key: metric.key, label: metric.label, value: number(metric.raw!), accessibilityLabel: metric.label + ': ' + number(metric.raw!) }))} /> : null}

`+s.slice(end);
fs.writeFileSync(path,s);
// Restore original JSON formatting and append only the newly localized namespace.
for(const language of ['en','hi','gu']) {
 const p='apps/mobile/src/i18n/locales/'+language+'/home.json';const data=JSON.parse(fs.readFileSync(p,'utf8'));const original=cp.execFileSync('git',['show','HEAD:'+p],{encoding:'utf8'}).trimEnd();const addition=JSON.stringify(data.dashboard,null,2).split('\n').map((line,index)=>(index===0?'': '  ')+line).join('\n');fs.writeFileSync(p,original.slice(0,-1).trimEnd()+',\n  "dashboard": '+addition+'\n}\n');
}
// Check protected UI sections verbatim against this turn's starting source.
const original=fs.readFileSync('.tmp/dashboard-screen-before.tsx','utf8');
const header=text=>text.slice(text.indexOf('      <View style={styles.homeHeader}>'),text.indexOf('      <ProjectContextCard'));
const originalHeader=header(original).trimEnd();
if(!s.includes(originalHeader))throw new Error('Protected header changed');
const footer='<CustomerTabBar activeKey="home" />';if(!s.includes(footer))throw new Error('Protected footer changed');
console.log('Header JSX unchanged; existing CustomerTabBar preserved.');
