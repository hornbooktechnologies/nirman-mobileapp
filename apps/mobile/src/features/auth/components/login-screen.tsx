import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Image,
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
} from "../../../components/ui";
import { getLocalizedErrorMessage } from "../../../i18n";
import { isValidEmail } from "../../../lib/validation";
import { useSession } from "../../../providers";
import { mobileShadows, mobileText, mobileTheme } from "../../../theme";

export function LoginScreen() {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
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
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
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
                  source={require("../../../../assets/brand/horizontal-logo.png")}
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
                  <Input
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
                    secureTextEntry
                    value={password}
                  />
                </FormField>
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
                <View style={styles.invitation}>
                  <Button
                    disabled={isSubmitting}
                    label={t("login.activateInvitation")}
                    variant="ghost"
                    onPress={() => router.push("/(auth)/activate")}
                  />
                </View>
              </GlassCard>
              <LanguagePicker compact showDescription={false} />
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
    paddingVertical: mobileTheme.spacing[8],
  },
  content: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    gap: mobileTheme.spacing[5],
  },
  brandBlock: {
    alignItems: "center",
    gap: mobileTheme.spacing[3],
  },
  logo: {
    height: 100,
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
    lineHeight: 22,
  },
  form: {
    gap: mobileTheme.spacing[4],
    padding: mobileTheme.spacing[5],
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
  input: { minHeight: 54, backgroundColor: mobileTheme.color.background.app },
  invitation: {
    borderTopWidth: 1,
    borderTopColor: mobileTheme.color.border.subtle,
    paddingTop: mobileTheme.spacing[2],
  },
});
