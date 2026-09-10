export const dashboardAssets = {
  background: require("../../../../../assets/dashboard/backgrounds/dashboard-background.png"),
  dashboardCard: require("../../../../../assets/dashboard/backgrounds/dashboardcard-bg.png"),
  blueprint: require("../../../../../assets/dashboard/backgrounds/blueprint-overlay.png"),
  lineArt: require("../../../../../assets/dashboard/backgrounds/construction-line-art.png"),
  building: require("../../../../../assets/dashboard/hero/selected-project-building.png"),
  crane: require("../../../../../assets/dashboard/hero/crane-overlay.png"),
  heroDecoration: require("../../../../../assets/dashboard/hero/project-hero-decoration.png"),
  progress: require("../../../../../assets/dashboard/progress/progress-building.png"),
  ring: require("../../../../../assets/dashboard/progress/progress-ring.png"),
  stage: require("../../../../../assets/dashboard/progress/construction-stage-icon.png"),
  helmet: require("../../../../../assets/dashboard/project-summary/helmet.png"),
  folder: require("../../../../../assets/dashboard/project-summary/project-folder.png"),
  assigned: require("../../../../../assets/dashboard/statistics/assigned-workers.png"),
  present: require("../../../../../assets/dashboard/statistics/present-workers.png"),
  absent: require("../../../../../assets/dashboard/statistics/absent-workers.png"),
  expense: require("../../../../../assets/dashboard/statistics/expense-wallet.png"),
  sales: require("../../../../../assets/dashboard/statistics/sales-chart.png"),
  calendar: require("../../../../../assets/dashboard/statistics/calendar.png"),
  inventory: require("../../../../../assets/dashboard/statistics/inventory-box.png"),
  create: require("../../../../../assets/dashboard/quick-actions/create-project.png"),
  attendance: require("../../../../../assets/dashboard/quick-actions/attendance.png"),
  update: require("../../../../../assets/dashboard/quick-actions/update-progress.png"),
  more: require("../../../../../assets/dashboard/quick-actions/more-actions.png"),
  money: require("../../../../../assets/dashboard/financial/money-stack.png"),
  kharchi: require("../../../../../assets/dashboard/financial/kharchi-wallet.png"),
  wages: require("../../../../../assets/dashboard/financial/wage-payment.png"),
  warning: require("../../../../../assets/dashboard/attention/warning.png"),
  material: require("../../../../../assets/dashboard/attention/material-request.png"),
  activity: require("../../../../../assets/dashboard/activity/site-update.png"),
} as const;

export function actionArtwork(key: string) {
  if (key === "create-project") return dashboardAssets.create;
  if (key === "MARK_ATTENDANCE" || key === "attendance")
    return dashboardAssets.attendance;
  if (key === "UPDATE_PROGRESS" || key === "progress")
    return dashboardAssets.update;
  if (key === "VIEW_PROJECT" || key === "project")
    return dashboardAssets.building;
  if (key === "ADD_KHARCHI" || key === "kharchi")
    return dashboardAssets.kharchi;
  if (key === "REQUEST_MATERIAL" || key === "materials")
    return dashboardAssets.material;
  if (key === "ADD_EXPENSE" || key === "expenses")
    return dashboardAssets.expense;
  if (key === "UPLOAD_PHOTO" || key === "gallery")
    return dashboardAssets.activity;
  if (key === "ADD_LEAD" || key === "sales") return dashboardAssets.sales;
  if (key === "VIEW_FOLLOWUPS" || key === "calendar")
    return dashboardAssets.calendar;
  return dashboardAssets.more;
}
