import type { WageBatch, WagePreview } from './types';

// Always check a fresh server list before requesting calculations, not the screen's cached list.
export async function prepareWagePreview(
  start: string,
  end: string,
  loadBatches: () => Promise<WageBatch[]>,
  loadPreview: () => Promise<WagePreview>,
  isCurrent: () => boolean,
) {
  const batches = await loadBatches();
  if (!isCurrent()) return null;
  const overlaps = batches.some(batch =>
    batch.status !== 'CANCELLED' && batch.periodStart <= end && batch.periodEnd >= start,
  );
  if (overlaps) return { batches, preview: null };
  const preview = await loadPreview();
  return isCurrent() ? { batches, preview } : null;
}
