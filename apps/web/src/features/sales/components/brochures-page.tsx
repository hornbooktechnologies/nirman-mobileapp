"use client";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BROCHURE_CATEGORIES,
  BROCHURE_MAX_SELECTION,
  type BrochureAsset,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Checkbox,
  Input,
  LoadingState,
  Select,
  Textarea,
} from "@/components/ui";
import { RefreshButton } from "@/components/ui/refresh-button";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { brochuresService } from "../services/brochures.service";
import { failureMessage, label } from "../sales-rules";
import { PrivateBrochureMedia } from "./private-brochure-media";

const key = (o: string, p: string) => ["brochures", o, p] as const;
function size(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MiB`
    : `${Math.ceil(bytes / 1024)} KiB`;
}
function Brochures({ c }: { c: SalesContext }) {
  const query = useQuery({
    queryKey: key(c.org, c.project),
    queryFn: ({ signal }) => brochuresService.list(c.org, c.project, signal),
  });
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PROJECT");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const selectedAssets = useMemo(
    () => (query.data?.items ?? []).filter((a) => selected.includes(a.id)),
    [query.data, selected],
  );
  function toggleAsset(assetId: string) {
    if (selected.includes(assetId)) {
      setSelected((current) => current.filter((id) => id !== assetId));
      return;
    }
    if (selected.length >= BROCHURE_MAX_SELECTION) {
      setError(`Select up to ${BROCHURE_MAX_SELECTION} brochures at a time.`);
      return;
    }
    setSelected((current) => [...current, assetId]);
  }
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: key(c.org, c.project) });
  };
  async function run(action: () => Promise<string>) {
    setBusy(true);
    setError("");
    try {
      setNotice(await action());
      await refresh();
    } catch (cause) {
      setError(failureMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  async function shareOther() {
    await run(async () => {
      const result = await brochuresService.other(c.org, c.project, selected);
      const url = result.share.shareUrl!;
      const nativeShare = typeof navigator.share === "function";
      if (nativeShare) {
        try {
          await navigator.share({
            title: `${selected.length} project brochures`,
            text: "Property information shared from NirmanSite",
            url,
          });
        } catch (cause) {
          if ((cause as DOMException).name !== "AbortError") throw cause;
        }
      } else {
        await navigator.clipboard.writeText(url);
      }
      return nativeShare
        ? "Share options opened."
        : "Private brochure link copied.";
    });
  }
  if (query.isPending) return <LoadingState label="Loading brochures" />;
  if (query.isError)
    return (
      <Card>
        <p role="alert">{query.error.message}</p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </Card>
    );
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-lime-sub">
            Sales enablement
          </p>
          <h1 className="text-2xl font-semibold">Project brochures</h1>
          <p className="text-sub">
            Keep every customer-facing PDF, image and video ready to share.
          </p>
        </div>
        <RefreshButton
          variant="outline"
          busy={query.isFetching}
          onRefresh={refresh}
        >
          Refresh
        </RefreshButton>
      </header>
      {c.active && c.permissions.includes("brochures:upload") && (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Add marketing material</h2>
            <p className="text-sm text-sub">
              PDF, JPEG, PNG, WebP, MP4 or MOV.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block" htmlFor="brochure-file">
                File *
              </label>
              <Input
                id="brochure-file"
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null;
                  setFile(next);
                  if (next && !title)
                    setTitle(next.name.replace(/\.[^.]+$/, ""));
                }}
              />
              {file && (
                <p className="mt-1 text-sm text-sub">
                  {file.name} · {size(file.size)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block" htmlFor="brochure-title">
                Title *
              </label>
              <Input
                id="brochure-title"
                value={title}
                maxLength={160}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block" htmlFor="brochure-category">
                Category
              </label>
              <Select
                id="brochure-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {BROCHURE_CATEGORIES.map((v) => (
                  <option key={v} value={v}>
                    {label(v)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block" htmlFor="brochure-description">
                Description
              </label>
              <Textarea
                id="brochure-description"
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={
              busy ||
              !file ||
              title.trim().length < 2
            }
            onClick={() =>
              void run(async () => {
                if (!file) throw new Error("Select a file.");
                await brochuresService.upload(c.org, c.project, {
                  file,
                  title: title.trim(),
                  description: description.trim() || undefined,
                  category,
                  assetId: crypto.randomUUID(),
                  idempotencyKey: crypto.randomUUID(),
                });
                setFile(null);
                setTitle("");
                setDescription("");
                return "Brochure uploaded.";
              })
            }
          >
            {busy ? "Uploading…" : "Upload brochure"}
          </Button>
        </Card>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-inner border border-success/20 bg-success/5 p-3 text-success"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-inner border border-danger/20 bg-danger/5 p-3 text-danger"
        >
          {error}
        </p>
      )}
      <section className="space-y-3" aria-label="Brochure library">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Marketing library</h2>
            <p className="text-sm text-sub">
              Select exactly what this customer should receive.
            </p>
          </div>
          {selected.length > 0 && c.permissions.includes("brochures:share") && (
            <Button variant="outline" onClick={() => setSelected([])}>
              Clear {selected.length}
            </Button>
          )}
        </div>
        {!query.data.items.length ? (
          <Card>
            No brochures yet. Upload the first customer-ready file above.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {query.data.items.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                org={c.org}
                project={c.project}
                selected={selected.includes(asset.id)}
                toggle={() => toggleAsset(asset.id)}
                canManage={c.permissions.includes("brochures:manage")}
                remove={() =>
                  void run(async () => {
                    await brochuresService.delete(c.org, c.project, asset.id);
                    setSelected((v) => v.filter((id) => id !== asset.id));
                    return "Brochure deleted.";
                  })
                }
              />
            ))}
          </div>
        )}
      </section>
      {selected.length > 0 && c.permissions.includes("brochures:share") && (
        <Card className="sticky bottom-4 z-10 space-y-3 border-lime/30 shadow-floating">
          <div>
            <h2 className="font-semibold">
              Share {selected.length} selected{" "}
              {selected.length === 1 ? "item" : "items"}
            </h2>
            <p className="text-sm text-sub">
              {selectedAssets.map((a) => a.title).join(" · ")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <Input
              type="email"
              aria-label="Recipient email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              aria-label="Recipient name"
              placeholder="Customer name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button
              disabled={busy || !email.includes("@")}
              onClick={() =>
                void run(async () => {
                  const result = await brochuresService.email(
                    c.org,
                    c.project,
                    {
                      assetIds: selected,
                      recipientEmail: email.trim(),
                      recipientName: name.trim() || undefined,
                      idempotencyKey: crypto.randomUUID(),
                    },
                  );
                  return result.message;
                })
              }
            >
              Email
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void shareOther()}
            >
              Other…
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
function AssetCard({
  asset,
  org,
  project,
  selected,
  toggle,
  canManage,
  remove,
}: {
  asset: BrochureAsset;
  org: string;
  project: string;
  selected: boolean;
  toggle: () => void;
  canManage: boolean;
  remove: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-card border bg-surface shadow-card transition ${selected ? "border-lime ring-2 ring-lime/20" : "border-hairline"}`}
    >
      <PrivateBrochureMedia
        org={org}
        project={project}
        assetId={asset.id}
        title={asset.title}
        image={asset.mimeType.startsWith("image/")}
      />
      <div className="space-y-3 p-4">
        <Checkbox
          checked={selected}
          onChange={toggle}
          label={`Select ${asset.title}`}
        />
        <div>
          <h3 className="font-semibold">{asset.title}</h3>
          <p className="text-sm text-sub">
            {label(asset.category)} · {size(asset.byteSize)} ·{" "}
            {asset.uploadedBy}
          </p>
          {asset.description && (
            <p className="mt-1 text-sm text-sub">{asset.description}</p>
          )}
        </div>
        {canManage && (
          <Button variant="ghost" onClick={() => { if (window.confirm("Permanently delete this brochure? Existing share links will no longer show it.")) remove(); }}>
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
export function BrochuresPage({ projectId }: { projectId?: string }) {
  return (
    <SalesWorkspace projectId={projectId} section="brochures">
      {(c) => <Brochures c={c} />}
    </SalesWorkspace>
  );
}
