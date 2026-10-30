"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, LoadingState } from '@/components/ui';
import { brochuresService } from '../services/brochures.service';

export function BrochureShareHistory({ organizationId, projectId }: { organizationId: string; projectId: string }) {
  const [open, setOpen] = useState(false);
  const history = useQuery({ queryKey: ['brochure-share-history', organizationId, projectId], queryFn: ({ signal }) => brochuresService.history(organizationId, projectId, signal), enabled: open });
  return <section className="space-y-3">
    <Button variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>Share history</Button>
    {open ? <>
      <p className="text-sm text-sub">The latest 100 share records returned by the API.</p>
      <Button variant="outline" disabled={history.isFetching} onClick={() => void history.refetch()}>Refresh history</Button>
      {history.isPending ? <LoadingState label="Loading share history" /> : history.isError ? <p role="alert">{history.error.message}</p> : <>
        {!history.data.length ? <p>No share history yet.</p> : null}
        {history.data.map(row => <Card key={row.id} className="space-y-1 break-words"><p>{row.recipientName || row.recipientEmail || 'Other sharing channel'}</p><p>{row.status.replaceAll('_', ' ')} · {row.emailDeliveryStatus.replaceAll('_', ' ')}</p><p className="text-sm text-sub">{row.createdAt} · {row.assetCount} files · Expires {row.expiresAt}</p></Card>)}
      </>}
    </> : null}
  </section>;
}
