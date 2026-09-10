import {
  GALLERY_CATEGORIES,
  PROJECT_PROGRESS_STAGES,
  type GalleryCategory,
  type GalleryEntry,
  type GallerySummary,
  type ProjectProgressStage,
} from "@nirman-app/shared";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  InteractionManager,
  Pressable,
  RefreshControl,
  SectionList,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  AppIcon,
  AppText,
  AppliedFilterChip,
  AppliedFilters,
  BottomSheet,
  Button,
  Card,
  Chip,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FilterGroup,
  FilterOption,
  FormError,
  FormField,
  IconButton,
  Input,
  ListFilterSheet,
  LoadingState,
  NirmanScreenBackground,
} from "../../components/ui";
import {
  formatDate,
  getLocalizedErrorMessage,
  type SupportedLanguage,
} from "../../i18n";
import { getActiveProject, getActiveProjectPermissions } from "../../lib/auth";
import { useLocalization, useSession } from "../../providers";
import { mobileText, mobileTheme } from "../../theme";
import { CustomerTabBar } from "../home/components";
import { ProjectContextCard } from "../projects";
import { AuthenticatedGalleryImage } from "./authenticated-gallery-image";
import {
  enqueueGalleryUpload,
  readGalleryQueue,
  removeGalleryQueue,
  updateGalleryQueue,
} from "./queue";
import {
  fetchGalleryEntries,
  fetchGallerySummary,
  uploadGalleryEntry,
} from "./services";
import type { QueuedGalleryUpload } from "./types";

export function GalleryScreen() {
  const { t } = useTranslation("gallery");
  const { t: tCommon } = useTranslation("common");
  const { language } = useLocalization();
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = project?.id ?? null;
  const token = session?.accessToken ?? null;
  const canRead = permissions.includes("gallery:read");
  const canUpload =
    permissions.includes("gallery:upload") && project?.status === "ACTIVE";
  const [items, setItems] = useState<GalleryEntry[]>([]);
  const [summary, setSummary] = useState<GallerySummary | null>(null);
  const [queue, setQueue] = useState<QueuedGalleryUpload[]>([]);
  const [category, setCategory] = useState<GalleryCategory | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftCategory, setDraftCategory] = useState<
    GalleryCategory | undefined
  >();
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<GalleryEntry | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { width } = useWindowDimensions();
  const columnCount = width >= 700 ? 6 : 4;
  const thumbnailGap = mobileTheme.spacing[1];
  const thumbnailSize = Math.floor(
    (width - mobileTheme.spacing[5] * 2 - thumbnailGap * (columnCount - 1)) /
      columnCount,
  );
  const sections = useMemo(
    () =>
      buildGallerySections(
        items,
        language,
        columnCount,
        t("diary.today"),
        t("diary.yesterday"),
      ),
    [columnCount, items, language, t],
  );

  const refreshQueue = useCallback(async () => {
    const all = await readGalleryQueue();
    setQueue(
      all.filter(
        (row) =>
          row.organizationId === organizationId && row.projectId === projectId,
      ),
    );
  }, [organizationId, projectId]);
  const load = useCallback(
    async (nextPage = 1, append = false) => {
      if (!organizationId || !projectId || !token || !canRead) {
        setLoading(false);
        return;
      }
      append ? setLoadingMore(true) : setLoading(true);
      setError("");
      try {
        const [list, nextSummary] = await Promise.all([
          fetchGalleryEntries(organizationId, projectId, token, {
            page: nextPage,
            pageSize: 48,
            category,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
          append
            ? Promise.resolve(null)
            : fetchGallerySummary(organizationId, projectId, token),
        ]);
        setItems((current) =>
          append
            ? [
                ...current,
                ...list.items.filter(
                  (item) => !current.some((row) => row.id === item.id),
                ),
              ]
            : list.items,
        );
        setPage(list.pagination.page);
        setTotalPages(list.pagination.totalPages);
        if (nextSummary) setSummary(nextSummary);
      } catch (loadError) {
        setError(getLocalizedErrorMessage(loadError, t("errors.loadFailed")));
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [canRead, category, dateFrom, dateTo, organizationId, projectId, t, token],
  );
  useEffect(() => {
    setItems([]);
    void load(1);
    void refreshQueue();
  }, [load, refreshQueue]);

  async function sendQueued(item: QueuedGalleryUpload) {
    if (!token) return;
    await updateGalleryQueue(item.entryId, {
      state: "UPLOADING",
      attempts: item.attempts + 1,
      lastError: undefined,
    });
    await refreshQueue();
    try {
      await uploadGalleryEntry(item, token);
      await removeGalleryQueue(item.entryId);
      setSuccess(t("success.uploaded"));
      await Promise.all([refreshQueue(), load(1)]);
    } catch (uploadError) {
      await updateGalleryQueue(item.entryId, {
        state: "FAILED",
        attempts: item.attempts + 1,
        lastError: getLocalizedErrorMessage(
          uploadError,
          t("errors.uploadFailed"),
        ),
      });
      await refreshQueue();
    }
  }

  if (!project || !projectId)
    return (
      <NirmanScreenBackground footer={<CustomerTabBar activeKey="gallery" />}>
        <CompactScreenHeader title={t("screen.title")} />
        <ProjectContextCard compact showSwitchAction />
        <EmptyState
          title={t("empty.noProjectTitle")}
          description={t("empty.noProjectDescription")}
        />
      </NirmanScreenBackground>
    );
  if (!canRead)
    return (
      <NirmanScreenBackground footer={<CustomerTabBar activeKey="gallery" />}>
        <CompactScreenHeader
          title={t("screen.title")}
          subtitle={project.name}
        />
        <EmptyState
          title={t("empty.permissionTitle")}
          description={t("empty.permissionDescription")}
        />
      </NirmanScreenBackground>
    );

  const activeFilterCount =
    Number(Boolean(category)) +
    Number(Boolean(dateFrom)) +
    Number(Boolean(dateTo));
  const hasFilters = activeFilterCount > 0;
  const dateRangeInvalid = Boolean(
    draftDateFrom && draftDateTo && draftDateFrom > draftDateTo,
  );
  function openFilters() {
    setDraftCategory(category);
    setDraftDateFrom(dateFrom);
    setDraftDateTo(dateTo);
    setFiltersOpen(true);
  }

  function clearFilters() {
    setDraftCategory(undefined);
    setDraftDateFrom("");
    setDraftDateTo("");
    setCategory(undefined);
    setDateFrom("");
    setDateTo("");
    setFiltersOpen(false);
  }

  const header = (
    <View style={styles.header}>
      <CompactScreenHeader
        title={t("screen.title")}
        subtitle={project.name}
        action={
          <View style={styles.headerActions}>
            <IconButton
              icon="filter-variant"
              variant={activeFilterCount ? "primary" : "default"}
              badgeCount={activeFilterCount}
              accessibilityLabel={t("filter.actionA11y", {
                count: activeFilterCount,
              })}
              onPress={openFilters}
            />
            {canUpload ? (
              <IconButton
                icon="camera-plus-outline"
                variant="primary"
                accessibilityLabel={t("capture.openA11y")}
                onPress={() => setCaptureOpen(true)}
              />
            ) : null}
          </View>
        }
      />
      <ProjectContextCard compact showSwitchAction />
      {hasFilters ? (
        <AppliedFilters>
          {category ? (
            <AppliedFilterChip
              label={t(`category.${category}`)}
              removeAccessibilityLabel={t("filter.removeA11y", {
                value: t(`category.${category}`),
              })}
              onRemove={() => setCategory(undefined)}
            />
          ) : null}
          {dateFrom ? (
            <AppliedFilterChip
              label={t("filter.fromChip", {
                date: formatDate(dateOnly(dateFrom), language),
              })}
              removeAccessibilityLabel={t("filter.removeA11y", {
                value: formatDate(dateOnly(dateFrom), language),
              })}
              onRemove={() => setDateFrom("")}
            />
          ) : null}
          {dateTo ? (
            <AppliedFilterChip
              label={t("filter.toChip", {
                date: formatDate(dateOnly(dateTo), language),
              })}
              removeAccessibilityLabel={t("filter.removeA11y", {
                value: formatDate(dateOnly(dateTo), language),
              })}
              onRemove={() => setDateTo("")}
            />
          ) : null}
        </AppliedFilters>
      ) : null}
      {success ? (
        <Card
          variant="selected"
          style={styles.message}
          accessibilityRole="alert"
        >
          <AppIcon
            name="check-circle-outline"
            size={22}
            color={mobileTheme.color.status.success.foreground}
          />
          <AppText style={styles.messageText} weight={600}>
            {success}
          </AppText>
          <IconButton
            icon="close"
            variant="ghost"
            accessibilityLabel={tCommon("actions.close")}
            onPress={() => setSuccess("")}
          />
        </Card>
      ) : null}
      {/* <GallerySummaryCard summary={summary} /> */}
      {queue.length ? (
        <View style={styles.queueSection}>
          <View style={styles.sectionHeading}>
            <AppText style={styles.sectionTitle} weight={700}>
              {t("queue.title")}
            </AppText>
            <AppText style={styles.sectionMeta}>
              {t("queue.count", { count: queue.length })}
            </AppText>
          </View>
          {queue.map((item) => (
            <QueueCard
              key={item.entryId}
              item={item}
              onRetry={() => void sendQueued(item)}
            />
          ))}
        </View>
      ) : null}
      <View style={styles.sectionHeading}>
        <AppText style={styles.sectionTitle} weight={700}>
          {t("diary.title")}
        </AppText>
        <AppText style={styles.sectionMeta}>
          {t("diary.count", { count: items.length })}
        </AppText>
      </View>
    </View>
  );

  return (
    <NirmanScreenBackground
      footer={<CustomerTabBar activeKey="gallery" />}
      scroll={false}
    >
      <SectionList
        key={`gallery-grid-${columnCount}`}
        sections={sections}
        keyExtractor={(row) => row.key}
        stickySectionHeadersEnabled
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.all([load(1), refreshQueue()]);
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <LoadingState label={t("loading.list")} />
          ) : error ? (
            <EmptyState
              title={t("errors.title")}
              description={error}
              actionLabel={tCommon("actions.retry")}
              onAction={() => void load(1)}
            />
          ) : (
            <EmptyState
              title={hasFilters ? t("empty.filteredTitle") : t("empty.title")}
              description={
                hasFilters
                  ? t("empty.filteredDescription")
                  : t("empty.description")
              }
              actionLabel={canUpload ? t("capture.action") : undefined}
              onAction={canUpload ? () => setCaptureOpen(true) : undefined}
            />
          )
        }
        ListFooterComponent={
          loadingMore ? <LoadingState label={t("loading.more")} /> : null
        }
        onEndReachedThreshold={0.35}
        onEndReached={() => {
          if (!loading && !loadingMore && page < totalPages)
            void load(page + 1, true);
        }}
        renderSectionHeader={({ section }) => (
          <View style={styles.monthHeader}>
            <View style={styles.monthBadge}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <AppIcon
                  name="calendar-month-outline"
                  size={mobileTheme.icon.sm}
                  color={mobileTheme.color.action.primary}
                />
              </View>
              <AppText style={styles.monthTitle} weight={700}>
                {section.title}
              </AppText>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <GalleryGridRowView
            row={item}
            token={token!}
            language={language}
            columnCount={columnCount}
            thumbnailSize={thumbnailSize}
            onOpen={setSelectedEntry}
          />
        )}
      />
      {filtersOpen ? (
        <ListFilterSheet
          visible
          title={t("filter.sheetTitle")}
          description={t("filter.sheetDescription")}
          clearLabel={tCommon("listFilters.clearAll")}
          applyLabel={tCommon("listFilters.apply")}
          onClear={clearFilters}
          onClose={() => setFiltersOpen(false)}
          onApply={() => {
            if (dateRangeInvalid) return;
            setCategory(draftCategory);
            setDateFrom(draftDateFrom);
            setDateTo(draftDateTo);
            setFiltersOpen(false);
          }}
        >
          <FilterGroup label={t("filter.category")}>
            <FilterOption
              label={t("filter.all")}
              selected={!draftCategory}
              onPress={() => setDraftCategory(undefined)}
            />
            {GALLERY_CATEGORIES.map((value) => (
              <FilterOption
                key={value}
                label={t(`category.${value}`)}
                selected={draftCategory === value}
                onPress={() => setDraftCategory(value)}
              />
            ))}
          </FilterGroup>
          <View style={styles.dateFilters}>
            <FormField label={t("filter.dateFrom")}>
              <DateInput
                accessibilityLabel={t("filter.dateFromA11y")}
                value={draftDateFrom}
                maximumDate={new Date()}
                invalid={dateRangeInvalid}
                onChangeText={setDraftDateFrom}
              />
            </FormField>
            <FormField label={t("filter.dateTo")}>
              <DateInput
                accessibilityLabel={t("filter.dateToA11y")}
                value={draftDateTo}
                minimumDate={
                  draftDateFrom ? dateOnly(draftDateFrom) : undefined
                }
                maximumDate={new Date()}
                invalid={dateRangeInvalid}
                onChangeText={setDraftDateTo}
              />
            </FormField>
            <FormError
              message={dateRangeInvalid ? t("filter.dateRangeError") : ""}
            />
          </View>
        </ListFilterSheet>
      ) : null}
      {captureOpen ? (
        <CaptureSheet
          organizationId={organizationId!}
          projectId={projectId}
          onClose={() => setCaptureOpen(false)}
          onQueued={(item) => {
            setCaptureOpen(false);
            InteractionManager.runAfterInteractions(() => {
              void sendQueued(item);
            });
          }}
        />
      ) : null}
      {selectedEntry ? (
        <GalleryDetailSheet
          entry={selectedEntry}
          token={token!}
          language={language}
          onClose={() => setSelectedEntry(null)}
        />
      ) : null}
    </NirmanScreenBackground>
  );
}

function GallerySummaryCard({ summary }: { summary: GallerySummary | null }) {
  const { t } = useTranslation("gallery");
  return (
    <Card variant="blueprint" style={styles.summary}>
      <View style={styles.summaryIcon}>
        <AppIcon
          name="image-multiple-outline"
          size={28}
          color={mobileTheme.color.action.primary}
        />
      </View>
      <View style={styles.summaryCopy}>
        <AppText style={styles.summaryTitle} weight={700}>
          {t("summary.title")}
        </AppText>
        <AppText style={styles.summaryText}>
          {summary
            ? t("summary.values", {
                total: summary.totalApproved,
                today: summary.uploadedToday,
              })
            : t("loading.summary")}
        </AppText>
      </View>
    </Card>
  );
}

function QueueCard({
  item,
  onRetry,
}: {
  item: QueuedGalleryUpload;
  onRetry: () => void;
}) {
  const { t } = useTranslation("gallery");
  return (
    <Card style={styles.queueCard}>
      <Image
        accessible
        accessibilityLabel={t("queue.previewA11y")}
        source={{ uri: item.uri }}
        style={styles.queueImage}
      />
      <View style={styles.queueCopy}>
        <AppText weight={700}>{t(`queue.state.${item.state}`)}</AppText>
        <AppText style={styles.caption} numberOfLines={2}>
          {item.lastError ?? t(`category.${item.category}`)}
        </AppText>
      </View>
      <Button
        size="sm"
        fullWidth={false}
        label={
          item.state === "UPLOADING" ? t("queue.uploading") : t("queue.retry")
        }
        disabled={item.state === "UPLOADING"}
        onPress={onRetry}
      />
    </Card>
  );
}

type GalleryGridRow = {
  key: string;
  dayTitle?: string;
  entries: GalleryEntry[];
};

type GalleryMonthSection = {
  title: string;
  data: GalleryGridRow[];
};

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00`);
}

function calendarKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function buildGallerySections(
  entries: GalleryEntry[],
  language: SupportedLanguage,
  columnCount: number,
  todayLabel: string,
  yesterdayLabel: string,
): GalleryMonthSection[] {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = calendarKey(today);
  const yesterdayKey = calendarKey(yesterday);
  const months = new Map<
    string,
    {
      title: string;
      days: Map<string, { title: string; entries: GalleryEntry[] }>;
    }
  >();

  entries.forEach((entry) => {
    const capturedAt = new Date(entry.capturedAt);
    const monthKey = `${capturedAt.getFullYear()}-${String(
      capturedAt.getMonth() + 1,
    ).padStart(2, "0")}`;
    const dayKey = calendarKey(capturedAt);
    const month = months.get(monthKey) ?? {
      title: formatDate(capturedAt, language, {
        month: "long",
        year: "numeric",
      }),
      days: new Map(),
    };
    const day = month.days.get(dayKey) ?? {
      title:
        dayKey === todayKey
          ? todayLabel
          : dayKey === yesterdayKey
            ? yesterdayLabel
            : formatDate(capturedAt, language, {
                day: "numeric",
                month: "short",
                weekday: "short",
              }),
      entries: [],
    };
    day.entries.push(entry);
    month.days.set(dayKey, day);
    months.set(monthKey, month);
  });

  return Array.from(months.values()).map((month) => {
    const data: GalleryGridRow[] = [];
    month.days.forEach((day, dayKey) => {
      for (let index = 0; index < day.entries.length; index += columnCount) {
        data.push({
          key: `${dayKey}-${index}`,
          dayTitle: index === 0 ? day.title : undefined,
          entries: day.entries.slice(index, index + columnCount),
        });
      }
    });
    return { title: month.title, data };
  });
}

function GalleryGridRowView({
  row,
  token,
  language,
  columnCount,
  thumbnailSize,
  onOpen,
}: {
  row: GalleryGridRow;
  token: string;
  language: SupportedLanguage;
  columnCount: number;
  thumbnailSize: number;
  onOpen: (entry: GalleryEntry) => void;
}) {
  const { t } = useTranslation("gallery");
  return (
    <View style={styles.dayBlock}>
      {row.dayTitle ? (
        <AppText style={styles.dayTitle} weight={700}>
          {row.dayTitle}
        </AppText>
      ) : null}
      <View style={styles.thumbnailRow}>
        {row.entries.map((entry) => (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityLabel={t("diary.openPhotoA11y", {
              date: formatDate(entry.capturedAt, language),
            })}
            style={({ pressed }) => [
              styles.thumbnail,
              { height: thumbnailSize, width: thumbnailSize },
              pressed && styles.thumbnailPressed,
            ]}
            onPress={() => onOpen(entry)}
          >
            <AuthenticatedGalleryImage
              entry={entry}
              token={token}
              compact
              accessibilityLabel={
                entry.caption ??
                t("card.photoA11y", {
                  category: t(`category.${entry.category}`),
                })
              }
              style={styles.thumbnailImage}
            />
          </Pressable>
        ))}
        {Array.from({ length: columnCount - row.entries.length }).map(
          (_, index) => (
            <View
              key={`placeholder-${index}`}
              style={{ height: thumbnailSize, width: thumbnailSize }}
            />
          ),
        )}
      </View>
    </View>
  );
}

function GalleryDetailSheet({
  entry,
  token,
  language,
  onClose,
}: {
  entry: GalleryEntry;
  token: string;
  language: SupportedLanguage;
  onClose: () => void;
}) {
  const { t } = useTranslation("gallery");
  return (
    <BottomSheet
      visible
      title={t("detail.title")}
      description={formatDate(entry.capturedAt, language, {
        dateStyle: "full",
        timeStyle: "short",
      })}
      scroll
      onClose={onClose}
    >
      <AuthenticatedGalleryImage
        entry={entry}
        token={token}
        accessibilityLabel={
          entry.caption ??
          t("card.photoA11y", { category: t(`category.${entry.category}`) })
        }
        style={styles.detailImage}
      />
      <View style={styles.detailGrid}>
        <GalleryDetailRow
          label={t("detail.category")}
          value={t(`category.${entry.category}`)}
        />
        <GalleryDetailRow
          label={t("detail.stage")}
          value={entry.stage ? t(`stage.${entry.stage}`) : t("detail.noStage")}
        />
        <GalleryDetailRow
          label={t("detail.uploadedBy")}
          value={entry.uploadedBy}
        />
        <GalleryDetailRow
          label={t("detail.caption")}
          value={entry.caption || t("detail.noCaption")}
        />
      </View>
    </BottomSheet>
  );
}

function GalleryDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText style={styles.detailLabel} weight={700}>
        {label}
      </AppText>
      <AppText style={styles.detailValue}>{value}</AppText>
    </View>
  );
}

function CaptureSheet({
  organizationId,
  projectId,
  onClose,
  onQueued,
}: {
  organizationId: string;
  projectId: string;
  onClose: () => void;
  onQueued: (item: QueuedGalleryUpload) => void;
}) {
  const { t } = useTranslation("gallery");
  const { t: tCommon } = useTranslation("common");
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [category, setCategory] = useState<GalleryCategory>("WORK");
  const [stage, setStage] = useState<ProjectProgressStage | undefined>();
  const [caption, setCaption] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function pick(source: "camera" | "library") {
    setError("");
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t(`capture.${source}Permission`));
      return;
    }
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.75,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.75,
            selectionLimit: 1,
          });
    if (!result.canceled) setAsset(result.assets[0]);
  }
  async function save() {
    if (!asset) {
      setError(t("validation.photoRequired"));
      return;
    }
    setWorking(true);
    setError("");
    try {
      onQueued(
        await enqueueGalleryUpload({
          organizationId,
          projectId,
          asset,
          category,
          stage,
          caption,
        }),
      );
    } catch (queueError) {
      setError(getLocalizedErrorMessage(queueError, t("errors.queueFailed")));
    } finally {
      setWorking(false);
    }
  }
  return (
    <BottomSheet
      visible
      title={t("capture.title")}
      description={t("capture.description")}
      scroll
      showCloseButton={false}
      onClose={onClose}
      footer={
        <>
          <Button
            label={tCommon("actions.cancel")}
            variant="secondary"
            onPress={onClose}
          />
          <Button
            label={working ? t("capture.saving") : t("capture.queue")}
            disabled={working}
            onPress={() => void save()}
          />
        </>
      }
    >
      <FormError message={error} />
      {asset ? (
        <Image
          accessible
          accessibilityLabel={t("capture.previewA11y")}
          source={{ uri: asset.uri }}
          style={styles.preview}
        />
      ) : (
        <View style={styles.sourceRow}>
          <Button
            label={t("capture.camera")}
            leadingIcon="camera-outline"
            variant="info"
            onPress={() => void pick("camera")}
          />
          <Button
            label={t("capture.library")}
            leadingIcon="image-outline"
            variant="secondary"
            onPress={() => void pick("library")}
          />
        </View>
      )}
      {asset ? (
        <Button
          label={t("capture.change")}
          variant="secondary"
          leadingIcon="image-edit-outline"
          onPress={() => void pick("library")}
        />
      ) : null}
      <FormField label={t("fields.category")} required>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {GALLERY_CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={t(`category.${value}`)}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </ScrollView>
      </FormField>
      <FormField label={t("fields.stage")} optional>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label={t("fields.noStage")}
            selected={!stage}
            onPress={() => setStage(undefined)}
          />
          {PROJECT_PROGRESS_STAGES.map((value) => (
            <Chip
              key={value}
              label={t(`stage.${value}`)}
              selected={stage === value}
              onPress={() => setStage(value)}
            />
          ))}
        </ScrollView>
      </FormField>
      <FormField
        label={t("fields.caption")}
        optional
        helperText={t("fields.captionHelper")}
      >
        <Input
          multiline
          numberOfLines={4}
          maxLength={1000}
          value={caption}
          onChangeText={setCaption}
          style={styles.multiline}
        />
      </FormField>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: mobileTheme.spacing[8] },
  header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[4] },
  headerActions: { flexDirection: "row", gap: mobileTheme.spacing[2] },
  message: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
  },
  messageText: {
    ...mobileText.body,
    color: mobileTheme.color.status.success.foreground,
    flex: 1,
  },
  summary: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[4],
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.status.info.background,
    borderRadius: mobileTheme.radius.full,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  summaryCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  summaryTitle: { ...mobileText.sectionTitle },
  summaryText: { ...mobileText.body },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionMeta: { ...mobileText.caption },
  chips: { gap: mobileTheme.spacing[2], paddingRight: mobileTheme.spacing[5] },
  dateFilters: { gap: mobileTheme.spacing[3] },
  queueSection: { gap: mobileTheme.spacing[2] },
  queueCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
  },
  queueImage: { borderRadius: mobileTheme.radius.md, height: 58, width: 58 },
  queueCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  caption: { ...mobileText.caption },
  monthHeader: {
    alignItems: "flex-start",
    paddingBottom: mobileTheme.spacing[3],
  },
  monthBadge: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    minHeight: 44,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[2],
  },
  monthTitle: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  dayBlock: {
    gap: mobileTheme.spacing[2],
    marginBottom: mobileTheme.spacing[3],
  },
  dayTitle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  thumbnailRow: {
    flexDirection: "row",
    gap: mobileTheme.spacing[1],
  },
  thumbnail: {
    backgroundColor: mobileTheme.color.status.neutral.background,
    borderRadius: mobileTheme.radius.sm,
    overflow: "hidden",
  },
  thumbnailPressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  thumbnailImage: { height: "100%", width: "100%" },
  detailImage: {
    backgroundColor: mobileTheme.color.status.neutral.background,
    borderRadius: mobileTheme.radius.lg,
    height: 360,
    width: "100%",
  },
  detailGrid: { gap: mobileTheme.spacing[3] },
  detailRow: {
    borderBottomColor: mobileTheme.color.border.subtle,
    borderBottomWidth: 1,
    gap: mobileTheme.spacing[1],
    paddingBottom: mobileTheme.spacing[3],
  },
  detailLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  detailValue: { ...mobileText.body, color: mobileTheme.color.text.primary },
  preview: { borderRadius: mobileTheme.radius.lg, height: 260, width: "100%" },
  sourceRow: { gap: mobileTheme.spacing[3] },
  multiline: {
    minHeight: 104,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: "top",
  },
});
