# Dashboard asset library

38 separate PNG assets in 10 folders, totaling 7,855,417 bytes (7.86 MB). 35 final assets were generated using the built-in image_gen tool, two reuse approved brand illustrations, and `dashboardcard-bg.png` is the user-supplied approved hero background. All object and overlay exports retain real transparency. Original generated artwork was exported at 256px for small assets, 768px for hero/progress imagery, and up to 1024px for backgrounds. No image-generation CLI or new app dependency was used.

[Exact prompts, dimensions, origin, alpha checks and file sizes](manifest.json) · [Design mapping](../../../../docs/tasks/dashboard-asset-redesign.md)

## Folder structure and complete list

```text
dashboard/
  backgrounds/
    blueprint-overlay.png
    construction-line-art.png
    dashboard-background.png
    dashboardcard-bg.png
  hero/
    crane-overlay.png
    project-hero-decoration.png
    selected-project-building.png
  progress/
    construction-stage-icon.png
    progress-building.png
    progress-ring.png
  project-summary/
    helmet.png
    project-folder.png
    site-building-mini.png
  statistics/
    absent-workers.png
    assigned-workers.png
    calendar.png
    expense-wallet.png
    inventory-box.png
    present-workers.png
    sales-chart.png
  quick-actions/
    attendance.png
    create-project.png
    more-actions.png
    update-progress.png
  financial/
    kharchi-wallet.png
    money-stack.png
    wage-payment.png
  attention/
    delayed-work.png
    material-request.png
    warning.png
  activity/
    labour-photo-placeholder.png
    material-delivery.png
    site-update.png
  decorative/
    blueprint-paper.png
    bulldozer.png
    cement-bags.png
    construction-tools.png
    safety-helmet.png
```

## Usage

Dashboard components import static local PNGs through `src/features/home/components/Dashboard/assets.ts`. Text, metrics, percentages, statuses and navigation stay native and localized. The ring PNG is a decorative neutral track; the live progress arc is animated from the real API percentage. Optional decorative art is intentionally not all mounted at once.

`progress/progress-building.png` and `project-summary/site-building-mini.png` reuse the approved brand library. The activity images are illustrative fallbacks, never evidence of a real site event. Production activity uses authenticated Gallery thumbnails. `attention/delayed-work.png` is reserved until an approved API exposes delayed-work data; the redesign does not invent that metric.
