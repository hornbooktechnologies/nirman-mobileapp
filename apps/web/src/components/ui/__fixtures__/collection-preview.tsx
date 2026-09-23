"use client";

import { useEffect, useState } from "react";
import { Button } from "../button";
import { CollectionToolbar, CollectionPagination } from "../collection-toolbar";
import { PageHeader, SectionHeader } from "../layout";
import { FieldLabel } from "../typography";
import { Input } from "../input";
import { Select } from "../select";

// Development-only, API-free fixtures using the production primitives.
export function CollectionPreview({ framed = false }: { framed?: boolean }) {
  const [width, setWidth] = useState(1366);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ status: "" });
  const [page, setPage] = useState(3);
  const [focus, setFocus] = useState("");
  const [lock, setLock] = useState("");
  useEffect(() => {
    const report = () => {
      const active = document.activeElement;
      setFocus(
        (
          active?.getAttribute("aria-label") ||
          active?.id ||
          active?.textContent ||
          "none"
        ).slice(0, 100),
      );
      setLock(document.body.style.overflow || "unlocked");
    };
    document.addEventListener("focusin", report);
    const observer = new MutationObserver(report);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => {
      document.removeEventListener("focusin", report);
      observer.disconnect();
    };
  }, []);
  if (!framed)
    return (
      <main className="space-y-4 p-4">
        <p>
          Production foundation fixture. 683px tests the CSS layout width of a
          1366px window at 200% zoom; it is not a native browser zoom test.
        </p>
        <div className="flex flex-wrap gap-2">
          {[1366, 768, 683, 360].map((size) => (
            <Button key={size} variant="outline" onClick={() => setWidth(size)}>
              {size}px viewport
            </Button>
          ))}
        </div>
        <iframe
          title="Foundation fixture viewport"
          src="/foundation-preview?frame=1"
          style={{ width, height: 1000, border: "1px solid" }}
        />
      </main>
    );
  return (
    <main className="space-y-6 p-6">
      <p>
        Development fixture — synthetic data, no API requests or business
        actions.
      </p>
      <output className="block text-sm">
        Applied: {filters.status || "all"}; search: {search || "empty"}; page:{" "}
        {page}; focus: {focus}; body scroll: {lock}
      </output>
      <div
        style={{ width: 1024, maxWidth: "100%" }}
        className="space-y-6 border border-hairline p-4"
      >
        <PageHeader
          title={"Riverside Residential Project — ".repeat(4).slice(0, 120)}
          description="Long project name and crowded actions"
          actions={
            <div className="flex flex-wrap gap-2">
              {[
                "Team",
                "Attendance",
                "Wages",
                "Kharchi",
                "Materials",
                "Site Expenses",
                "Progress",
                "Gallery",
                "Sales leads",
                "Archive",
                "Restore",
              ].map((name) => (
                <Button variant="outline" key={name}>
                  {name}
                </Button>
              ))}
            </div>
          }
        />
        <SectionHeader
          title="Collection foundation"
          description="Shared section heading and field labels"
        />
        <CollectionToolbar
          name="fixture projects"
          scope="Organization: Long organization name for a local verification fixture"
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPage(1);
            },
          }}
          filters={{
            value: filters,
            defaults: { status: "" },
            count: filters.status ? 1 : 0,
            onApply: (value) => {
              setFilters(value);
              setPage(1);
            },
            fields: (draft, setDraft, id) => (
              <div>
                <FieldLabel htmlFor={`${id}-status`}>Project status</FieldLabel>
                <Select
                  id={`${id}-status`}
                  value={draft.status}
                  onChange={(event) => setDraft({ status: event.target.value })}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
            ),
          }}
        />
        <CollectionPagination
          page={page}
          pageCount={4}
          total={80}
          onPageChange={setPage}
        />
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_180px_180px]">
          <Select
            aria-label="Organization fixture"
            className="w-full max-w-full"
          >
            <option>{"Long organization name ".repeat(5)}</option>
          </Select>
          <Input
            aria-label="Workers search fixture"
            placeholder="Search code, name, or mobile"
          />
          <Select aria-label="Workers status fixture">
            <option>All statuses</option>
          </Select>
          <Input aria-label="Workers trade fixture" placeholder="Trade" />
        </div>
      </div>
      <div className="h-[100vh]" aria-hidden="true" />
    </main>
  );
}
