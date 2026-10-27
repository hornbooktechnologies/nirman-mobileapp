import { useCallback, useRef, useState } from "react";
import { Alert, Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { File, Paths } from "expo-file-system";
import { uuid } from "expo";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useSession } from "../../../providers";
import { AppIcon } from "../../../components/ui";
import { appConfig } from "../../../config";
import { apiRequest } from "../../../lib/api";
import {
  appendUploadFile,
  multipartUpload,
} from "../../../lib/multipart-upload";
import { uploadErrorMessage } from "../../../lib/upload-errors";
import { mobileTheme } from "../../../theme";

export function ProfilePhotoButton() {
  const { t } = useTranslation("home");
  const { session, refreshSession } = useSession();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [photo, setPhoto] = useState<{ userId: string; avatar: string | null; uri?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const userId = session?.user.id;
  const token = session?.accessToken;
  useFocusEffect(useCallback(() => {
    if (!userId || !token) return;
    let active = true;
    let cached: File | undefined;
    const cleanup = () => {
      try { if (cached?.exists) cached.delete(); } catch { /* OS may already have evicted the cache. */ }
    };
    void (async () => {
      const profile = await apiRequest<{ data: { avatar: string | null } }>(
        "/users/me", {}, { accessToken: token },
      );
      const current = profile.data.avatar;
      let uri = current ?? undefined;
      if (current?.startsWith("profile-photos/") && Platform.OS !== "web") {
        cached = new File(Paths.cache, `profile-${uuid.v4()}.${current.split('.').pop()}`);
        const image = await File.downloadFileAsync(
          `${appConfig.apiBaseUrl}/users/me/avatar`, cached,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        uri = image.uri;
      }
      if (active) setPhoto({ userId, avatar: current, uri });
      else cleanup();
    })().catch((error: unknown) => {
      cleanup();
      if (active) Alert.alert(t("profilePhoto.title"), uploadErrorMessage(error, t("profilePhoto.failed")));
    });
    return () => { active = false; cleanup(); };
  }, [userId, token, revision, t]));
  const currentPhoto = photo?.userId === userId ? photo : null;
  const avatar = currentPhoto ? currentPhoto.avatar : session?.user.avatarUrl;
  const owned = avatar?.startsWith("profile-photos/");
  const source = currentPhoto?.uri && Platform.OS !== "web"
    ? { uri: currentPhoto.uri }
    : owned
    ? {
        uri: `${appConfig.apiBaseUrl}/users/me/avatar?v=${encodeURIComponent(avatar!)}`,
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      }
    : avatar
      ? { uri: avatar }
      : undefined;
  async function change(action: "camera" | "library" | "remove") {
    if (lock.current || !session) return;
    lock.current = true;
    setBusy(true);
    try {
      if (action === "remove")
        await apiRequest(
          "/users/me/avatar",
          { method: "DELETE" },
          { accessToken: session.accessToken },
        );
      else {
        const permission =
          action === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error(t("profilePhoto.permission"));
        const options: ImagePicker.ImagePickerOptions = {
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          preferredAssetRepresentationMode:
            ImagePicker.UIImagePickerPreferredAssetRepresentationMode
              .Compatible,
        };
        const result =
          action === "camera"
            ? await ImagePicker.launchCameraAsync(options)
            : await ImagePicker.launchImageLibraryAsync(options);
        if (result.canceled) return;
        const image = result.assets[0];
        if (image.fileSize && image.fileSize > 5 * 1024 * 1024)
          throw new Error(t("profilePhoto.tooLarge"));
        const mime = image.mimeType ?? "image/jpeg";
        const form = new FormData();
        await appendUploadFile(form, {
          uri: image.uri,
          name: `profile.${mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"}`,
          type: mime,
        });
        await multipartUpload("/users/me/avatar", session.accessToken, form);
      }
      setRevision((value) => value + 1);
      await refreshSession();
    } catch (error) {
      Alert.alert(
        t("profilePhoto.title"),
        uploadErrorMessage(error, t("profilePhoto.failed")),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("profilePhoto.title")}
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      style={styles.avatar}
      onPress={() =>
        Alert.alert(t("profilePhoto.title"), t("profilePhoto.help"), [
          {
            text: t("profilePhoto.camera"),
            onPress: () => void change("camera"),
          },
          {
            text: t("profilePhoto.library"),
            onPress: () => void change("library"),
          },
          ...(avatar
            ? [
                {
                  text: t("profilePhoto.remove"),
                  style: "destructive" as const,
                  onPress: () => void change("remove"),
                },
              ]
            : [{ text: t("profilePhoto.cancel"), style: "cancel" as const }]),
        ], { cancelable: true })
      }
    >
      {source ? (
        <Image source={source} style={styles.image} />
      ) : (
        <AppIcon
          name="account"
          size={mobileTheme.icon.xl}
          color={mobileTheme.color.text.brand}
        />
      )}
      <View style={styles.camera}>
        <AppIcon
          name={busy ? "progress-clock" : "camera-outline"}
          size={mobileTheme.icon.xs}
          color={mobileTheme.color.text.inverse}
        />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mobileTheme.color.surface.mist,
  },
  image: { width: "100%", height: "100%", borderRadius: 38 },
  camera: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 20,
    backgroundColor: mobileTheme.color.action.primary,
  },
});
