import React from 'react';
import { createRoot } from 'react-dom/client';
import { Image, View } from 'react-native';
import { AppFontProvider } from '../apps/mobile/src/components/ui/app-text';
import { ActivityTimeline, DashboardBackdrop, DashboardTabs, ProgressCard, ProjectHero, ProjectSummary, QuickActions, SalesPulse, SiteStatsCard } from '../apps/mobile/src/features/home/components/Dashboard';
import { dashboardAssets } from '../apps/mobile/src/features/home/components/Dashboard/assets';
import en from '../apps/mobile/src/i18n/locales/en/home.json';
import hi from '../apps/mobile/src/i18n/locales/hi/home.json';
import gu from '../apps/mobile/src/i18n/locales/gu/home.json';
const language=new URLSearchParams(location.search).get('lang')||'en';
const t=({en,hi,gu} as any)[language];
const noop=()=>{document.body.dataset.action='activated';};
const actions=[{key:'create-project',label:t.dashboard.create,onPress:noop},{key:'MARK_ATTENDANCE',label:t.dashboard.attendance,onPress:noop},{key:'UPDATE_PROGRESS',label:t.dashboard.progress,onPress:noop},{key:'more',label:t.quickActions.more,onPress:noop}];
const metrics=[{key:'expenses',label:t.finance.expenses,value:'₹1,24,500',accessibilityLabel:t.finance.expenses},{key:'kharchi',label:t.finance.outstandingKharchi,value:'₹6,500',accessibilityLabel:t.finance.outstandingKharchi},{key:'wages',label:t.finance.wageEstimate,value:'₹42,800',accessibilityLabel:t.finance.wageEstimate}];
const attention=[{label:language==='en'?'3 material requests':t.attention.materialApprovals_other.replace('{{count}}','3'),meta:t.attention.materialApprovalsMeta,accessibilityLabel:t.attention.title,onPress:noop},{label:language==='en'?'1 overdue material request':t.attention.overdueMaterials_other.replace('{{count}}','1'),meta:t.attention.overdueMaterialsMeta,accessibilityLabel:t.attention.title,onPress:noop,tone:'danger' as const}];
function App(){return <AppFontProvider fontsAvailable><View style={{padding:20,backgroundColor:'#FEF6EB'}}><DashboardBackdrop>
<ProjectHero projectName="Sabarmati Commercial Center" selectedLabel={t.projectContext.selectedProject} location="Ahmedabad, Gujarat" tagline={t.dashboard.tagline} switchLabel={t.projectContext.switch} switchAccessibilityLabel={t.projectContext.switchProject} openLabel={t.projectContext.openProject} openAccessibilityLabel={t.projectContext.openProject} onSwitch={noop} onOpen={noop}/>
<ProjectSummary items={[{key:'sites',value:5,label:t.metrics.workingSites,accessibilityLabel:t.metrics.workingSites,tone:'brand'},{key:'scope',value:t.projectScope.ALL,label:t.metrics.projectScope,accessibilityLabel:t.metrics.projectScope,tone:'warm'}]}/>
<ProgressCard accessibilityLabel="Project progress 25%" percentage={25} emptyLabel="" onPress={noop} summaryLabel={t.progress.completion} statusLabel={t.progress.updatedStages_other.replace('{{count}}','3')} title={t.progress.title}/>
<SiteStatsCard title={t.today.title} dateLabel="9 Sep 2026" stats={['workers','present','absent','spend'].map((key,i)=>({key,label:t.today[key],value:[48,45,3,'₹24,500'][i],accessibilityLabel:t.today[key]}))}/>
<SalesPulse title={t.role.salesPulse} stats={['pipeline','overdueFollowUps','expiringBlocks','bookedUnits'].map((key,i)=>({key,label:t.role.metrics[key],value:[24,3,2,8][i],accessibilityLabel:t.role.metrics[key]}))}/>
<QuickActions title={t.quickActions.title} items={actions}/>
<DashboardTabs actions={actions} actionsLabel={t.quickActions.tab} attentionEmptyLabel={t.attention.clear} attentionItems={attention} attentionLabel={t.attention.tab} financeLabel={t.finance.tab} financeMetrics={metrics} showAttention/>
<ActivityTimeline title={t.activity.title} emptyLabel={t.activity.empty} viewAllLabel={t.activity.viewAll} onViewAll={noop} items={[{id:'fixture',title:language==='en'?'Slab work updated':t.progress.title,date:'9 Sep 2026 · 11:24',status:language==='en'?'Published':t.progress.title,statusTone:'success',onPress:noop,thumbnail:<Image source={dashboardAssets.activity} style={{width:60,height:60}}/>}]}/>
</DashboardBackdrop></View></AppFontProvider>}
createRoot(document.getElementById('root')!).render(<App/>);
