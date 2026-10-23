import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import {
  AppText,
  Button,
  FormError,
  FormField,
  GlassCard,
  Input,
  LanguagePicker,
  PasswordInput,
} from "../../../components/ui";
import { getLocalizedErrorMessage } from "../../../i18n";
import { isValidEmail } from "../../../lib/validation";
import { useSession } from "../../../providers";
import { brandAssets, mobileShadows, mobileText, mobileTheme } from "../../../theme";
import { PoweredByHornbook } from "./powered-by-hornbook";

export function LoginScreen() {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
  const useAutomaticKeyboardInsets = Platform.OS === "ios" && Platform.isPad;
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSession();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"email" | "password", string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submissionPending = useRef(false);

  async function openContactForm() {
    try {
      await Linking.openURL("https://nirmansite.com/contact");
    } catch {
      Alert.alert(t("login.newUserTitle"), t("login.contactLinkError"));
    }
  }

  async function handleSignIn() {
    if (submissionPending.current) return;
    setError(null);
    const nextFieldErrors: Partial<Record<"email" | "password", string>> = {};
    if (!email.trim()) {
      nextFieldErrors.email = tCommon("validation.required", {
        field: t("login.email"),
      });
    } else if (!isValidEmail(email)) {
      nextFieldErrors.email = tCommon("validation.email");
    }
    if (!password) {
      nextFieldErrors.password = tCommon("validation.required", {
        field: t("login.password"),
      });
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    submissionPending.current = true;
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      router.replace("/(app)/dashboard");
    } catch (signInError) {
      setError(signInError);
    } finally {
      submissionPending.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      <Image
        accessible={false}
        source={require("../../../../assets/brand/background.png")}
        resizeMode="cover"
        style={styles.backgroundImage}
      />
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" && !useAutomaticKeyboardInsets ? "padding" : undefined}
        >
          <ScrollView
            automaticallyAdjustKeyboardInsets={useAutomaticKeyboardInsets}
            contentContainerStyle={styles.screen}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.brandBlock}>
                <Image
                  accessibilityLabel="NirmanSite"
                  accessible
                  source={brandAssets.logoFull}
                  resizeMode="contain"
                  style={styles.logo}
                />
              </View>

              <GlassCard variant="strong" style={styles.form}>
                <View style={styles.heading}>
                  <LinearGradient
                    accessible={false}
                    colors={mobileTheme.gradient.progressAccent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accent}
                  />
                  <AppText
                    accessibilityRole="header"
                    style={styles.title}
                    weight={700}
                  >
                    {t("login.signIn")}
                  </AppText>
                  <AppText style={styles.body}>
                    {t("login.description")}
                  </AppText>
                </View>
                <FormError
                  message={
                    error
                      ? getLocalizedErrorMessage(error, t("failure.signIn"))
                      : null
                  }
                />
                <FormField
                  label={t("login.email")}
                  required
                  error={fieldErrors.email}
                >
                  <Input
                    accessibilityLabel={t("login.email")}
                    editable={!isSubmitting}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="username"
                    style={styles.input}
                    invalid={Boolean(fieldErrors.email)}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (fieldErrors.email)
                        setFieldErrors((current) => ({
                          ...current,
                          email: undefined,
                        }));
                    }}
                    placeholder={t("login.email")}
                    value={email}
                  />
                </FormField>
                <FormField
                  label={t("login.password")}
                  required
                  error={fieldErrors.password}
                >
                  <PasswordInput
                    accessibilityLabel={t("login.password")}
                    editable={!isSubmitting}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={() => void handleSignIn()}
                    style={styles.input}
                    invalid={Boolean(fieldErrors.password)}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (fieldErrors.password)
                        setFieldErrors((current) => ({
                          ...current,
                          password: undefined,
                        }));
                    }}
                    placeholder={t("login.password")}
                    showPasswordLabel={t("passwordVisibility.show")}
                    hidePasswordLabel={t("passwordVisibility.hide")}
                    value={password}
                  />
                </FormField>
                <Button
                  disabled={isSubmitting}
                  fullWidth={false}
                  label={t("login.forgotPassword")}
                  variant="ghost"
                  onPress={() =>
                    router.push({
                      pathname: "/(auth)/forgot-password",
                      params: { email: email.trim() },
                    })
                  }
                />
                <Button
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  label={
                    isSubmitting ? t("login.signingIn") : t("login.signIn")
                  }
                  size="lg"
                  style={mobileShadows.soft}
                  onPress={handleSignIn}
                />
                <View style={styles.contact}>
                  <AppText weight={700} style={styles.contactTitle}>
                    {t("login.newUserTitle")}
                  </AppText>
                  <AppText style={styles.contactDescription}>
                    {t("login.newUserDescription")}
                  </AppText>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityHint={t("login.contactLinkHint")}
                    onPress={() => void openContactForm()}
                    style={({ pressed }) => [styles.contactLink, pressed && { opacity: 0.65 }]}
                  >
                    <AppText weight={700} style={styles.contactLinkText}>
                      {t("login.contactLink")}
                    </AppText>
                  </Pressable>
                </View>
              </GlassCard>
              <LanguagePicker compact showDescription={false} />
              <PoweredByHornbook />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: mobileTheme.color.background.app },
  flex: { flex: 1 },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  screen: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: mobileTheme.spacing[5],
    paddingVertical: mobileTheme.spacing[3],
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    gap: mobileTheme.spacing[2],
  },
  brandBlock: {
    alignItems: "center",
    gap: mobileTheme.spacing[3],
  },
  logo: {
    height: 64,
    width: "100%",
    maxWidth: 280,
  },
  title: {
    ...mobileText.display,
    fontSize: 28,
    lineHeight: 36,
  },
  body: {
    ...mobileText.body,
    color: mobileTheme.color.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: mobileTheme.spacing[2],
    padding: mobileTheme.spacing[4],
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.color.background.elevated,
    borderColor: mobileTheme.color.border.subtle,
    ...mobileShadows.soft,
  },
  heading: {
    gap: mobileTheme.spacing[2],
    marginBottom: mobileTheme.spacing[2],
  },
  accent: {
    width: 48,
    height: 4,
    borderRadius: mobileTheme.radius.full,
    marginBottom: mobileTheme.spacing[2],
  },
  input: { minHeight: 48, backgroundColor: mobileTheme.color.background.app },
  contact: {
    borderTopWidth: 1,
    borderTopColor: mobileTheme.color.border.subtle,
    paddingTop: mobileTheme.spacing[3],
    alignItems: "center",
  },
  contactTitle: { ...mobileText.body, fontSize: 14, textAlign: "center" },
  contactDescription: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    textAlign: "center",
    lineHeight: 18,
  },
  contactLink: { minHeight: 44, justifyContent: "center", paddingHorizontal: mobileTheme.spacing[3] },
  contactLinkText: { ...mobileText.body, color: mobileTheme.color.text.primary, fontSize: 14, textDecorationLine: "underline" },

});
