import { useEffect, useState } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { File, Paths } from "expo-file-system";
import { uuid } from "expo";
import { useTranslation } from "react-i18next";
import { AppText, Button, LoadingState } from "../../components/ui";
import { uploadErrorMessage } from "../../lib/upload-errors";

export function BrochureImage({ url, token, title }: { url: string; token: string; title: string }) {
  const { t } = useTranslation("sales");
  const [image, setImage] = useState<{ url: string; token: string; uri: string } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let file: File | undefined;
    const cleanup = () => {
      try { if (file?.exists) file.delete(); } catch { /* Cache may be evicted by the OS. */ }
    };
    if (Platform.OS === "web") return;
    file = new File(Paths.cache, `brochure-preview-${uuid.v4()}`);
    void File.downloadFileAsync(url, file, { headers: { Authorization: `Bearer ${token}` } })
      .then((result) => {
        if (active) setImage({ url, token, uri: result.uri });
        else cleanup();
      })
      .catch((cause: unknown) => {
        cleanup();
        if (active) setError(uploadErrorMessage(cause, t("brochures.previewFailed")));
      });
    return () => { active = false; cleanup(); };
  }, [url, token, attempt, t]);
  const source = Platform.OS === "web"
    ? { uri: url, headers: { Authorization: `Bearer ${token}` } }
    : image?.url === url && image.token === token ? { uri: image.uri } : undefined;
  if (error) return <View style={styles.message}>
    <AppText numberOfLines={2}>{error}</AppText>
    <Button label={t("brochures.retryPreview")} variant="secondary" onPress={() => { setError(""); setImage(null); setAttempt((v) => v + 1); }} />
  </View>;
  return source ? <Image accessibilityLabel={title} source={source} style={styles.image} resizeMode="cover" onError={() => setError(t("brochures.previewFailed"))} />
    : <LoadingState label={t("brochures.loading")} />;
}
const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
  message: { flex: 1, justifyContent: "center", padding: 8 },
});
