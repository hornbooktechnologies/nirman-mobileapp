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
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  AppIcon,
  AppText,
  BottomSheet,
  Button,
  Card,
  Chip,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
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
import {
  enqueueGalleryUpload,
  readGalleryQueue,
  removeGalleryQueue,
  updateGalleryQueue,
} from "./queue";
import {
  approveGalleryEntry,
  fetchGalleryEntries,
  fetchGallerySummary,
  galleryMediaUrl,
  rejectGalleryEntry,
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
  const canApprove = permissions.includes("gallery:approve");
  const canReject = permissions.includes("gallery:reject");
  const [items, setItems] = useState<GalleryEntry[]>([]);
  const [summary, setSummary] = useState<GallerySummary | null>(null);
  const [queue, setQueue] = useState<QueuedGalleryUpload[]>([]);
  const [category, setCategory] = useState<GalleryCategory | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [review, setReview] = useState<{
    entry: GalleryEntry;
    action: "approve" | "reject";
  } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
            pageSize: 20,
            category,
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
    [canRead, category, organizationId, projectId, t, token],
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

  const header = (
    <View style={styles.header}>
      <CompactScreenHeader
        title={t("screen.title")}
        subtitle={project.name}
        action={
          canUpload ? (
            <IconButton
              icon="camera-plus-outline"
              variant="primary"
              accessibilityLabel={t("capture.openA11y")}
              onPress={() => setCaptureOpen(true)}
            />
          ) : undefined
        }
      />
      <ProjectContextCard compact showSwitchAction />
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
      <GallerySummaryCard summary={summary} />
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
      <View style={styles.filterSection}>
        <AppText style={styles.sectionTitle} weight={700}>
          {t("filter.title")}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label={t("filter.all")}
            selected={!category}
            onPress={() => setCategory(undefined)}
          />
          {GALLERY_CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={t(`category.${value}`)}
              selected={category === value}
              onPress={() => setCategory(value)}
            />
          ))}
        </ScrollView>
      </View>
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
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.gridRow}
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
              title={category ? t("empty.filteredTitle") : t("empty.title")}
              description={
                category
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
        renderItem={({ item }) => (
          <GalleryCard
            entry={item}
            token={token!}
            language={language}
            canApprove={
              canApprove && item.uploadedByUserId !== session?.user.id
            }
            canReject={canReject && item.uploadedByUserId !== session?.user.id}
            onReview={(action) => setReview({ entry: item, action })}
          />
        )}
      />
      {captureOpen ? (
        <CaptureSheet
          organizationId={organizationId!}
          projectId={projectId}
          onClose={() => setCaptureOpen(false)}
          onQueued={async (item) => {
            setCaptureOpen(false);
            await refreshQueue();
            void sendQueued(item);
          }}
        />
      ) : null}
      {review ? (
        <ReviewSheet
          value={review}
          organizationId={organizationId!}
          projectId={projectId}
          token={token!}
          onClose={() => setReview(null)}
          onSaved={() => {
            setReview(null);
            setSuccess(
              t(
                review.action === "approve"
                  ? "success.approved"
                  : "success.rejected",
              ),
            );
            void load(1);
          }}
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
                published: summary.totalApproved,
                pending: summary.pendingReview,
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

function GalleryCard({
  entry,
  token,
  language,
  canApprove,
  canReject,
  onReview,
}: {
  entry: GalleryEntry;
  token: string;
  language: SupportedLanguage;
  canApprove: boolean;
  canReject: boolean;
  onReview: (action: "approve" | "reject") => void;
}) {
  const { t } = useTranslation("gallery");
  const { width } = useWindowDimensions();
  const size = Math.max(
    142,
    (width - mobileTheme.spacing[5] * 2 - mobileTheme.spacing[3]) / 2,
  );
  return (
    <Card padding="none" style={[styles.galleryCard, { width: size }]}>
      <Image
        source={{
          uri: galleryMediaUrl(entry),
          headers: { Authorization: `Bearer ${token}` },
        }}
        accessible
        accessibilityLabel={
          entry.caption ??
          t("card.photoA11y", { category: t(`category.${entry.category}`) })
        }
        style={[styles.photo, { height: size }]}
      />
      <View style={styles.cardBody}>
        <View style={styles.cardMeta}>
          <AppText style={styles.category} weight={700}>
            {t(`category.${entry.category}`)}
          </AppText>
          <AppText
            style={[
              styles.status,
              entry.status === "REJECTED" && styles.statusDanger,
            ]}
            weight={700}
          >
            {t(`status.${entry.status}`)}
          </AppText>
        </View>
        <AppText style={styles.cardCaption} numberOfLines={3} weight={600}>
          {entry.caption || t("card.noCaption")}
        </AppText>
        <AppText style={styles.caption}>
          {formatDate(new Date(entry.capturedAt), language)} ·{" "}
          {entry.uploadedBy}
        </AppText>
        {entry.rejectionReason ? (
          <AppText style={styles.rejectReason}>{entry.rejectionReason}</AppText>
        ) : null}
        {entry.status === "PENDING" && (canApprove || canReject) ? (
          <View style={styles.reviewActions}>
            {canReject ? (
              <Button
                label={t("review.reject")}
                size="sm"
                variant="outline"
                fullWidth={false}
                onPress={() => onReview("reject")}
              />
            ) : null}
            {canApprove ? (
              <Button
                label={t("review.approve")}
                size="sm"
                variant="success"
                fullWidth={false}
                onPress={() => onReview("approve")}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
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

function ReviewSheet({
  value,
  organizationId,
  projectId,
  token,
  onClose,
  onSaved,
}: {
  value: { entry: GalleryEntry; action: "approve" | "reject" };
  organizationId: string;
  projectId: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation("gallery");
  const { t: tCommon } = useTranslation("common");
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (value.action === "reject" && reason.trim().length < 8) {
      setError(t("validation.rejectionReason"));
      return;
    }
    setWorking(true);
    setError("");
    try {
      if (value.action === "approve")
        await approveGalleryEntry(
          organizationId,
          projectId,
          value.entry.id,
          token,
          value.entry.version,
        );
      else
        await rejectGalleryEntry(
          organizationId,
          projectId,
          value.entry.id,
          token,
          value.entry.version,
          reason.trim(),
        );
      onSaved();
    } catch (reviewError) {
      setError(getLocalizedErrorMessage(reviewError, t("errors.reviewFailed")));
    } finally {
      setWorking(false);
    }
  }
  return (
    <BottomSheet
      visible
      title={t(`review.${value.action}Title`)}
      description={t(`review.${value.action}Description`)}
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
            label={working ? t("review.working") : t(`review.${value.action}`)}
            variant={value.action === "reject" ? "danger" : "success"}
            disabled={working}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <FormError message={error} />
      {value.action === "reject" ? (
        <FormField label={t("review.reason")} required>
          <Input
            multiline
            numberOfLines={4}
            maxLength={500}
            value={reason}
            onChangeText={setReason}
            style={styles.multiline}
          />
        </FormField>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: mobileTheme.spacing[8] },
  header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[4] },
  gridRow: {
    gap: mobileTheme.spacing[3],
    marginBottom: mobileTheme.spacing[3],
  },
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
  filterSection: { gap: mobileTheme.spacing[2] },
  chips: { gap: mobileTheme.spacing[2], paddingRight: mobileTheme.spacing[5] },
  queueSection: { gap: mobileTheme.spacing[2] },
  queueCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
  },
  queueImage: { borderRadius: mobileTheme.radius.md, height: 58, width: 58 },
  queueCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  galleryCard: { flex: 1, overflow: "hidden" },
  photo: {
    backgroundColor: mobileTheme.color.status.neutral.background,
    width: "100%",
  },
  cardBody: { gap: mobileTheme.spacing[2], padding: mobileTheme.spacing[3] },
  cardMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    justifyContent: "space-between",
  },
  category: {
    ...mobileText.caption,
    color: mobileTheme.color.text.brand,
    flex: 1,
  },
  status: {
    ...mobileText.caption,
    color: mobileTheme.color.status.success.foreground,
  },
  statusDanger: { color: mobileTheme.color.status.danger.foreground },
  cardCaption: { ...mobileText.body, color: mobileTheme.color.text.primary },
  caption: { ...mobileText.caption },
  rejectReason: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
  reviewActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[2],
  },
  preview: { borderRadius: mobileTheme.radius.lg, height: 260, width: "100%" },
  sourceRow: { gap: mobileTheme.spacing[3] },
  multiline: {
    minHeight: 104,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: "top",
  },
});
