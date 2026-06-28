// Profile screen — replaces old Settings tab
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  I18nManager,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useLocale } from "@/hooks/useLocale";

const NAVY = "#0f2040";
const GOLD = "#c9a84c";
const APP_VERSION = "1.0.0";

function MenuItem({ icon, label, value, onPress, danger }: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [s.menuItem, pressed && s.menuItemPressed]} onPress={onPress}>
      <View style={[s.menuIcon, { backgroundColor: danger ? "rgba(229,62,62,0.1)" : "rgba(15,32,64,0.06)" }]}>
        <MaterialIcons name={icon as never} size={20} color={danger ? "#e53e3e" : NAVY} />
      </View>
      <Text style={[s.menuLabel, danger && { color: "#e53e3e" }]}>{label}</Text>
      <View style={s.menuRight}>
        {value && <Text style={s.menuValue}>{value}</Text>}
        <MaterialIcons name="chevron-right" size={20} color="rgba(15,32,64,0.3)" />
      </View>
    </Pressable>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={s.sectionTitle}>{title}</Text>;
}

export default function ProfileScreen() {
  const { t, isAr }         = useLocale();
  const { appLang, setAppLang, favorites } = useApp();
  const insets               = useSafeAreaInsets();

  const toggleLang = () => {
    Haptics.selectionAsync().catch(() => {});
    const next = appLang === "ar" ? "en" : "ar";
    setAppLang(next);
    I18nManager.forceRTL(next === "ar");
  };

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f7fa" }}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Text style={s.headerTitle}>{t.profile.title}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 6, paddingBottom: 100 }}>

        {/* Guest card */}
        <View style={s.userCard}>
          <View style={s.avatarWrap}>
            <MaterialIcons name="person" size={36} color={GOLD} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{t.profile.guest}</Text>
            <Text style={s.userSub}>{t.profile.guestSub}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{favorites.length}</Text>
            <Text style={s.statLabel}>{t.favorites.title}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statNum}>0</Text>
            <Text style={s.statLabel}>{isAr ? "بحوثات محفوظة" : "Saved Searches"}</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statBox}>
            <Text style={s.statNum}>0</Text>
            <Text style={s.statLabel}>{isAr ? "مشاهدات" : "Views"}</Text>
          </View>
        </View>

        {/* ── Preferences ── */}
        <SectionHeader title={t.profile.preferences} />
        <View style={s.section}>
          <View style={[s.menuItem, { justifyContent: "space-between" }]}>
            <View style={s.menuLeft}>
              <View style={s.menuIcon}>
                <MaterialIcons name="language" size={20} color={NAVY} />
              </View>
              <Text style={s.menuLabel}>{t.profile.language}</Text>
            </View>
            <View style={[s.row, { gap: 10, alignItems: "center" }]}>
              <Text style={s.langLabel}>عربي</Text>
              <Switch
                value={appLang === "en"}
                onValueChange={toggleLang}
                trackColor={{ false: GOLD, true: NAVY }}
                thumbColor="#fff"
              />
              <Text style={s.langLabel}>En</Text>
            </View>
          </View>
        </View>

        {/* ── Account ── */}
        <SectionHeader title={t.profile.account} />
        <View style={s.section}>
          <MenuItem
            icon="notifications-none"
            label={t.profile.notifications}
            onPress={() => {}}
          />
          <MenuItem
            icon="bookmark-border"
            label={t.profile.savedSearches}
            value="0"
            onPress={() => {}}
          />
          <MenuItem
            icon="favorite-border"
            label={t.favorites.title}
            value={String(favorites.length)}
            onPress={() => router.push("/(tabs)/listings" as never)}
          />
        </View>

        {/* ── Financing calculator ── */}
        <SectionHeader title={isAr ? "الأدوات المالية" : "Financial Tools"} />
        <View style={s.section}>
          <MenuItem
            icon="calculate"
            label={isAr ? "حاسبة التمويل الإسلامي" : "Islamic Finance Calculator"}
            onPress={() => router.push("/(tabs)/ai-concierge" as never)}
          />
          <MenuItem
            icon="account-balance"
            label={isAr ? "مقارنة البنوك" : "Compare Banks"}
            onPress={() => router.push("/(tabs)/ai-concierge" as never)}
          />
        </View>

        {/* ── Support ── */}
        <SectionHeader title={t.profile.support} />
        <View style={s.section}>
          <MenuItem
            icon="info-outline"
            label={t.profile.about}
            onPress={() => openLink("https://rozoz.sa")}
          />
          <MenuItem
            icon="privacy-tip"
            label={t.profile.privacy}
            onPress={() => openLink("https://rozoz.sa/privacy")}
          />
          <MenuItem
            icon="gavel"
            label={t.profile.terms}
            onPress={() => openLink("https://rozoz.sa/terms")}
          />
          <MenuItem
            icon="headset-mic"
            label={t.profile.contactUs}
            onPress={() => Linking.openURL("mailto:info@housin.info").catch(() => {})}
          />
        </View>

        {/* App version */}
        <View style={s.versionWrap}>
          <Image
            source={require("@/assets/images/housin-logo.png")}
            style={{ width: 80, height: 26, marginBottom: 4 }}
            resizeMode="contain"
          />
          <Text style={s.versionText}>{t.profile.version} {APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header:        { backgroundColor: NAVY, paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle:   { fontSize: 26, fontFamily: "Inter_700Bold", color: "#fff" },

  userCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrap:    { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(15,32,64,0.06)", alignItems: "center", justifyContent: "center" },
  userName:      { fontSize: 18, fontFamily: "Inter_700Bold", color: NAVY },
  userSub:       { fontSize: 12, color: "rgba(15,32,64,0.5)", fontFamily: "Inter_400Regular", marginTop: 2 },

  statsRow:      { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  statBox:       { flex: 1, alignItems: "center", gap: 4 },
  statNum:       { fontSize: 22, fontFamily: "Inter_700Bold", color: NAVY },
  statLabel:     { fontSize: 11, color: "rgba(15,32,64,0.5)", textAlign: "center" },
  statDivider:   { width: 1, backgroundColor: "rgba(15,32,64,0.08)" },

  sectionTitle:  { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "rgba(15,32,64,0.5)", paddingHorizontal: 4, marginTop: 14, marginBottom: 4 },
  section:       { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },

  menuItem:      { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: "rgba(15,32,64,0.05)" },
  menuItemPressed: { backgroundColor: "rgba(15,32,64,0.03)" },
  menuLeft:      { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  menuIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,32,64,0.06)" },
  menuLabel:     { fontSize: 15, fontFamily: "Inter_500Medium", color: NAVY, flex: 1 },
  menuRight:     { flexDirection: "row", alignItems: "center", gap: 4 },
  menuValue:     { fontSize: 13, color: "rgba(15,32,64,0.4)", fontFamily: "Inter_400Regular" },

  row:           { flexDirection: "row" },
  langLabel:     { fontSize: 13, fontFamily: "Inter_600SemiBold", color: NAVY },

  versionWrap:   { alignItems: "center", paddingVertical: 24, gap: 6 },
  logoText:      { fontSize: 18, fontFamily: "Inter_700Bold", color: GOLD },
  versionText:   { fontSize: 12, color: "rgba(15,32,64,0.35)" },
});
