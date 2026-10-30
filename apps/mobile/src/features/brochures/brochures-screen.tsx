import { BrochureShareHistory } from "./brochure-share-history";
import { uuid } from "expo";
import { uploadErrorMessage } from "../../lib/upload-errors";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, View } from "react-native";
import { BrochureImage } from "./brochure-image";
import { useTranslation } from "react-i18next";
import { useRefreshOnFocus } from "../../lib/use-refresh-on-focus";
import {
  BROCHURE_CATEGORIES,
  BROCHURE_MAX_SELECTION,
  type BrochureAsset,
} from "@nirman-app/shared";
import {
  AppIcon,
  AppText,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
  LoadingState,
  NirmanScreenBackground,
  RefreshIconButton,
} from "../../components/ui";
import { getActiveProject, getActiveProjectPermissions } from "../../lib/auth";
import { isValidEmail } from "../../lib/validation";
import { useSession } from "../../providers";
import { mobileText, mobileTheme } from "../../theme";
import {
  deleteBrochure,
  brochureMediaUrl,
  createBrochureShareLink,
  fetchBrochures,
  shareBrochuresByEmail,
  uploadBrochure,
} from "./services";

type Picked = { uri: string; name: string; mimeType: string; size?: number };
const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MiB`
    : `${Math.ceil(bytes / 1024)} KiB`;

export function BrochuresScreen() {
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const alive = useRef(true);
  const lock = useRef(false);
  const [items, setItems] = useState<BrochureAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PROJECT");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [working, setWorking] = useState(false);
  const canUpload =
    project?.status === "ACTIVE" && permissions.includes("brochures:upload");
  const canShare =
    project?.status === "ACTIVE" && permissions.includes("brochures:share");
  const canManage =
    project?.status === "ACTIVE" && permissions.includes("brochures:manage");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const loadOrganizationId = session?.activeOrganization?.id;
  const loadProjectId = project?.id;
  const loadAccessToken = session?.accessToken;
  const load = useCallback(async () => {
    if (!loadOrganizationId || !loadProjectId || !loadAccessToken) return;
    setError("");
    try {
      const response = await fetchBrochures(
        loadOrganizationId,
        loadProjectId,
        loadAccessToken,
      );
      if (alive.current) {
        setItems(response.items);
        setSelected((current) =>
          current.filter((id) => response.items.some((item) => item.id === id)),
        );
      }
    } catch (cause) {
      if (alive.current) {
        const message = uploadErrorMessage(cause, t("brochures.errors.load"));
        setError(message);
        Alert.alert(t("brochures.errors.load"), message);
      }
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [loadOrganizationId, loadProjectId, loadAccessToken, t]);
  useRefreshOnFocus({
    scopeKey: `${session?.activeOrganization?.id ?? ""}:${project?.id ?? ""}`,
    refresh: load,
  });
  if (!project || !session?.activeOrganization)
    return (
      <NirmanScreenBackground scroll>
        <EmptyState
          title={t("noProject.title")}
          description={t("noProject.description")}
          actionLabel={t("noProject.action")}
          onAction={() => router.replace("/(app)/dashboard")}
        />
      </NirmanScreenBackground>
    );
  const organizationId = session.activeOrganization.id;
  const projectId = project.id;
  const accessToken = session.accessToken;
  async function choose() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: [
          "application/pdf",
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "video/quicktime",
        ],
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const next = {
        uri: asset.uri,
        name: asset.name,
        mimeType:
          asset.mimeType && asset.mimeType !== "application/octet-stream"
            ? asset.mimeType
            : ((
                {
                  pdf: "application/pdf",
                  jpg: "image/jpeg",
                  jpeg: "image/jpeg",
                  png: "image/png",
                  webp: "image/webp",
                  mp4: "video/mp4",
                  mov: "video/quicktime",
                } as Record<string, string>
              )[asset.name.split(".").pop()?.toLowerCase() ?? ""] ??
              "application/octet-stream"),
        size: asset.size,
      };
      setPicked(next);
      if (!title) setTitle(asset.name.replace(/\.[^.]+$/, ""));
    } catch (cause) {
      const message = uploadErrorMessage(cause, t("brochures.errors.action"));
      setError(message);
      Alert.alert(t("brochures.uploadTitle"), message);
    }
  }
  async function run(action: () => Promise<string>) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      const message = await action();
      if (alive.current) {
        setNotice(message);
        await load();
      }
    } catch (cause) {
      if (alive.current) {
        const message = uploadErrorMessage(cause, t("brochures.errors.action"));
        setError(message);
        Alert.alert(t("brochures.errors.action"), message);
      }
    } finally {
      lock.current = false;
      if (alive.current) setWorking(false);
    }
  }
  async function upload() {
    if (!picked || title.trim().length < 2) return;
    await run(async () => {
      await uploadBrochure(organizationId, projectId, accessToken, {
        ...picked,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
      });
      setShowUpload(false);
      setPicked(null);
      setTitle("");
      setDescription("");
      return t("brochures.uploaded");
    });
  }
  async function other() {
    await run(async () => {
      const result = await createBrochureShareLink(
        organizationId,
        projectId,
        accessToken,
        selected,
      );
      const url = result.share.shareUrl;
      if (!url) throw new Error(t("brochures.errors.action"));
      await Share.share({
        title: t("brochures.shareTitle"),
        message: `${t("brochures.shareMessage")}\n${url}`,
        url,
      });
      return t("brochures.shareOpened");
    });
  }
  async function sendEmail() {
    if (!isValidEmail(email)) {
      setError(tCommon("validation.email"));
      return;
    }
    await run(async () => {
      const result = await shareBrochuresByEmail(
        organizationId,
        projectId,
        accessToken,
        {
          assetIds: selected,
          recipientEmail: email.trim(),
          recipientName: name.trim() || undefined,
          idempotencyKey: uuid.v4(),
        },
      );
      setShowEmail(false);
      return result.message;
    });
  }
  function toggleAsset(assetId: string) {
    if (selected.includes(assetId)) {
      setSelected((current) => current.filter((id) => id !== assetId));
      return;
    }
    if (selected.length >= BROCHURE_MAX_SELECTION) {
      setError(
        t("brochures.selectionLimit", { count: BROCHURE_MAX_SELECTION }),
      );
      return;
    }
    setSelected((current) => [...current, assetId]);
  }
  return (
    <NirmanScreenBackground scroll>
      <View style={styles.screen}>
        <CompactScreenHeader
          leading={
            <IconButton
              icon="arrow-left"
              accessibilityLabel={tCommon("actions.back")}
              variant="glass"
              onPress={() => router.back()}
            />
          }
          title={t("brochures.title")}
          subtitle={project.name}
          action={
            <RefreshIconButton
              busy={loading}
              icon="refresh"
              accessibilityLabel={t("brochures.refresh")}
              variant="glass"
              onRefresh={load}
            />
          }
        />
        {loadOrganizationId && loadProjectId && loadAccessToken ? <BrochureShareHistory key={`${loadOrganizationId}:${loadProjectId}`} organizationId={loadOrganizationId} projectId={loadProjectId} token={loadAccessToken} /> : null}
        {canUpload ? (
          <Button
            label={t("brochures.upload")}
            leadingIcon="upload"
            onPress={() => setShowUpload(true)}
          />
        ) : null}
        <FormError message={error} />
        {notice ? (
          <AppText accessibilityLiveRegion="polite" style={styles.notice}>
            {notice}
          </AppText>
        ) : null}
        {loading ? (
          <LoadingState label={t("brochures.loading")} />
        ) : !items.length ? (
          <EmptyState
            style={styles.emptyState}
            title={t("brochures.emptyTitle")}
            description={t("brochures.emptyDescription")}
          />
        ) : (
          <View style={styles.list}>
            {items.map((asset) => {
              const active = selected.includes(asset.id);
              return (
                <Pressable
                  key={asset.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() => toggleAsset(asset.id)}
                >
                  <Card
                    variant={active ? "selected" : "default"}
                    padding="none"
                  >
                    <View style={styles.preview}>
                      {asset.mimeType.startsWith("image/") ? (
                        <BrochureImage key={`${asset.id}:${accessToken}`} url={brochureMediaUrl(asset)} token={accessToken} title={asset.title} />
                      ) : (
                        <View style={styles.fileType}>
                          <AppIcon
                            name={
                              asset.mimeType === "application/pdf"
                                ? "file-pdf-box"
                                : "video-outline"
                            }
                            size={34}
                            color={mobileTheme.color.text.inverse}
                          />
                          <AppText style={styles.fileTypeText} weight={700}>
                            {asset.mimeType === "application/pdf"
                              ? "PDF"
                              : "VIDEO"}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.row}>
                        <View style={styles.grow}>
                          <AppText style={styles.assetTitle} weight={700}>
                            {asset.title}
                          </AppText>
                          <AppText style={styles.assetMeta}>
                            {t(`brochures.category.${asset.category}`)} ·{" "}
                            {size(asset.byteSize)}
                          </AppText>
                        </View>
                        <AppIcon
                          name={
                            active
                              ? "checkbox-marked-circle"
                              : "checkbox-blank-circle-outline"
                          }
                          size={26}
                          color={
                            active
                              ? mobileTheme.color.action.primary
                              : mobileTheme.color.text.muted
                          }
                        />
                      </View>
                      {asset.description ? (
                        <AppText style={styles.assetMeta}>
                          {asset.description}
                        </AppText>
                      ) : null}
                      {canManage ? (
                        <Button
                          fullWidth={false}
                          size="sm"
                          variant="ghost"
                          label={t("brochures.delete")}
                          onPress={() =>
                            Alert.alert(
                              t("brochures.deleteTitle"),
                              asset.title,
                              [
                                {
                                  text: tCommon("actions.cancel"),
                                  style: "cancel",
                                },
                                {
                                  text: t("brochures.delete"),
                                  style: "destructive",
                                  onPress: () =>
                                    void run(async () => {
                                      await deleteBrochure(
                                        organizationId,
                                        projectId,
                                        accessToken,
                                        asset.id,
                                      );
                                      return t("brochures.deleted");
                                    }),
                                },
                              ],
                            )
                          }
                        />
                      ) : null}
                    </View>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
        {selected.length > 0 && canShare ? (
          <Card variant="raised">
            <AppText style={styles.assetTitle} weight={700}>
              {t("brochures.selected", { count: selected.length })}
            </AppText>
            <View style={styles.actions}>
              <Button
                style={styles.grow}
                label={t("brochures.email")}
                leadingIcon="email-outline"
                onPress={() => setShowEmail(true)}
              />
              <Button
                style={styles.grow}
                label={t("brochures.other")}
                variant="secondary"
                leadingIcon="share-variant-outline"
                onPress={() => void other()}
              />
            </View>
          </Card>
        ) : null}
      </View>
      <BottomSheet
        visible={showUpload}
        title={t("brochures.uploadTitle")}
        description={t("brochures.uploadDescription")}
        scroll
        onClose={() => setShowUpload(false)}
        footer={
          <Button validateForm
            label={t("brochures.upload")}
            loading={working}
            disabled={!picked || title.trim().length < 2}
            onPress={() => void upload()}
          />
        }
      >
        <View style={styles.form}>
          <Button
            label={
              picked ? t("brochures.changeFile") : t("brochures.chooseFile")
            }
            variant="secondary"
            onPress={() => void choose()}
          />
          {picked ? (
            <AppText style={styles.assetMeta}>
              {picked.name} · {size(picked.size ?? 0)}
            </AppText>
          ) : null}
          <FormField label={t("brochures.fileTitle")} required>
            <Input value={title} maxLength={160} onChangeText={setTitle} />
          </FormField>
          <FormField label={t("brochures.description")}>
            <Input
              value={description}
              maxLength={1000}
              multiline
              onChangeText={setDescription}
            />
          </FormField>
          <FormField label={t("brochures.categoryLabel")}>
            {BROCHURE_CATEGORIES.map((value) => (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                style={styles.choice}
              >
                <AppIcon
                  name={
                    category === value ? "radiobox-marked" : "radiobox-blank"
                  }
                  size={22}
                  color={mobileTheme.color.action.primary}
                />
                <AppText>{t(`brochures.category.${value}`)}</AppText>
              </Pressable>
            ))}
          </FormField>
        </View>
      </BottomSheet>
      <BottomSheet
        visible={showEmail}
        title={t("brochures.emailTitle")}
        description={t("brochures.emailDescription")}
        onClose={() => setShowEmail(false)}
        footer={
          <Button validateForm
            label={t("brochures.send")}
            loading={working}
            disabled={!isValidEmail(email)}
            onPress={() => void sendEmail()}
          />
        }
      >
        <View style={styles.form}>
          <FormField label={t("fields.email")} required>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </FormField>
          <FormField label={t("fields.customerName")}>
            <Input value={name} onChangeText={setName} />
          </FormField>
        </View>
      </BottomSheet>
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: mobileTheme.spacing[4],
    paddingBottom: mobileTheme.spacing[4],
  },
  emptyState: {
    backgroundColor: mobileTheme.color.surface.raised,
    paddingHorizontal: mobileTheme.spacing[5],
  },
  notice: {
    ...mobileText.caption,
    backgroundColor: mobileTheme.color.status.success.background,
    color: mobileTheme.color.status.success.foreground,
    padding: mobileTheme.spacing[3],
    borderRadius: mobileTheme.radius.md,
  },
  list: { gap: mobileTheme.spacing[3] },
  preview: { height: 150, overflow: "hidden" },
  image: { height: "100%", width: "100%" },
  fileType: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.brand.blueprint,
    flex: 1,
    gap: 6,
    justifyContent: "center",
  },
  fileTypeText: { color: mobileTheme.color.text.inverse },
  cardBody: { gap: mobileTheme.spacing[2], padding: mobileTheme.spacing[4] },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
  },
  grow: { flex: 1 },
  assetTitle: {
    ...mobileText.sectionTitle,
    fontSize: mobileTheme.typography.size.md,
  },
  assetMeta: { ...mobileText.caption },
  actions: {
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    marginTop: mobileTheme.spacing[3],
  },
  form: { gap: mobileTheme.spacing[4] },
  choice: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
    minHeight: 48,
  },
});
