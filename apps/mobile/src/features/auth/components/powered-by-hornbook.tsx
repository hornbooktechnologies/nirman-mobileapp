import { Alert, Linking, Pressable, StyleSheet } from "react-native";
import { SvgCss } from "react-native-svg/css";
import { useTranslation } from "react-i18next";

import { hornbookLogoXml } from "../../../../assets/brand/hornbook-logo";
import { AppText } from "../../../components/ui";
import { mobileText, mobileTheme } from "../../../theme";

const companyName = "Hornbook Technology Pvt Ltd";
const website = "https://www.hornbooktechnologies.com/";

export function PoweredByHornbook() {
  const { t } = useTranslation("auth");

  async function openWebsite() {
    try {
      await Linking.openURL(website);
    } catch {
      Alert.alert(companyName, t("login.poweredByLinkError"));
    }
  }

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${t("login.poweredBy")} ${companyName}`}
      accessibilityHint={t("login.poweredByHint")}
      onPress={() => void openWebsite()}
      style={({ pressed }) => [styles.footer, pressed && styles.pressed]}
    >
      <AppText style={styles.caption}>{t("login.poweredBy")}</AppText>
      <SvgCss
        xml={hornbookLogoXml}
        width={210}
        height={58}
        accessible={false}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    alignSelf: "center",
    paddingVertical: mobileTheme.spacing[2],
    paddingHorizontal: mobileTheme.spacing[3],
    gap: mobileTheme.spacing[1],
    maxWidth: "100%",
  },
  pressed: { opacity: 0.65 },
  caption: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    textAlign: "center",
  },
});
