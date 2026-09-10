import type { GalleryEntry } from "@nirman-app/shared";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";

import { AppIcon, AppText, LottieLoader } from "../../components/ui";
import { mobileText, mobileTheme } from "../../theme";
import { galleryMediaUrl } from "./services";

const cacheRoot = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
const cacheDirectory = cacheRoot ? `${cacheRoot}gallery-media/` : null;

function extensionFor(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function cacheAuthenticatedImage(
  entry: GalleryEntry,
  token: string,
  mediaUrl: string,
) {
  if (!cacheDirectory) throw new Error("Gallery image cache is unavailable");
  await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true });
  const destination = `${cacheDirectory}${entry.id}-v${entry.version}.${extensionFor(entry.mimeType)}`;
  const existing = await FileSystem.getInfoAsync(destination);
  if (existing.exists) return destination;

  const temporary = `${destination}.${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`;
  try {
    const result = await FileSystem.downloadAsync(mediaUrl, temporary, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (result.status !== 200) {
      throw new Error(`Gallery media request failed with ${result.status}`);
    }
    const completedByAnotherRequest =
      await FileSystem.getInfoAsync(destination);
    if (completedByAnotherRequest.exists) return destination;
    await FileSystem.moveAsync({ from: temporary, to: destination });
    return destination;
  } finally {
    await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(
      () => undefined,
    );
  }
}

export function AuthenticatedGalleryImage({
  entry,
  token,
  accessibilityLabel,
  style,
  compact = false,
}: {
  entry: GalleryEntry;
  token: string;
  accessibilityLabel: string;
  style: StyleProp<ImageStyle | ViewStyle>;
  compact?: boolean;
}) {
  const { t } = useTranslation("gallery");
  const mediaUrl = useMemo(() => galleryMediaUrl(entry), [entry]);
  const [attempt, setAttempt] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setLocalUri(null);
    if (Platform.OS === "web") {
      setLocalUri(mediaUrl);
      return () => {
        active = false;
      };
    }
    void cacheAuthenticatedImage(entry, token, mediaUrl)
      .then((uri) => {
        if (active) setLocalUri(uri);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, entry, mediaUrl, token]);

  return (
    <View style={[style, styles.container]}>
      {failed ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("card.retryPhoto")}
          onPress={() => setAttempt((value) => value + 1)}
          style={[styles.fill, styles.state, compact && styles.compactState]}
        >
          <AppIcon
            color={mobileTheme.color.text.muted}
            name="image-off-outline"
            size={mobileTheme.icon.lg}
          />
          {!compact ? (
            <>
              <AppText style={styles.stateText} weight={600}>
                {t("card.photoUnavailable")}
              </AppText>
              <AppText style={styles.retryText} weight={700}>
                {t("card.retryPhoto")}
              </AppText>
            </>
          ) : null}
        </Pressable>
      ) : !localUri ? (
        <View
          accessible
          accessibilityLabel={t("card.photoLoading")}
          style={[styles.fill, styles.state, compact && styles.compactState]}
        >
          <LottieLoader size={compact ? 20 : 28} />
          {!compact ? (
            <AppText style={styles.stateText}>{t("card.photoLoading")}</AppText>
          ) : null}
        </View>
      ) : (
        <Image
          source={
            Platform.OS === "web"
              ? {
                  uri: localUri,
                  headers: { Authorization: `Bearer ${token}` },
                }
              : { uri: localUri }
          }
          accessible
          accessibilityLabel={accessibilityLabel}
          resizeMode="cover"
          onError={() => {
            if (Platform.OS !== "web") {
              void FileSystem.deleteAsync(localUri, { idempotent: true }).catch(
                () => undefined,
              );
            }
            setFailed(true);
          }}
          style={styles.fill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: mobileTheme.color.status.neutral.background,
    overflow: "hidden",
  },
  fill: { height: "100%", width: "100%" },
  state: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.status.neutral.background,
    gap: mobileTheme.spacing[2],
    justifyContent: "center",
    padding: mobileTheme.spacing[3],
  },
  compactState: { padding: 0 },
  stateText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.muted,
    textAlign: "center",
  },
  retryText: {
    ...mobileText.caption,
    color: mobileTheme.color.action.primary,
    textAlign: "center",
  },
});
